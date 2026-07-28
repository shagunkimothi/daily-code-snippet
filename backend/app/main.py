import json
import os
import random
import re
import traceback
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

from app.auth import ALGORITHM, SECRET_KEY, create_access_token, oauth
from app.database import SessionLocal, engine, get_db
from app.dependencies import get_current_user
from app.models import Activity, CATEGORIES, DailySnippet, DIFFICULTY_LEVELS, Favorite, Snippet, Tag, User, snippet_tags
from app.schemas import (
    DailySnippetResponse,
    HeatmapEntry, HeatmapResponse,
    SnippetResponse, SnippetSearchResponse,
    TagResponse, UserCreate, UserResponse,
)
from app.security import hash_password, verify_password
from app.seed_data import seed_if_empty
from app import models

load_dotenv(override=False)

class SnippetCreate(BaseModel):
    title: str
    language: str = "JavaScript"
    code: str
    explanation: Optional[str] = ""
    difficulty: str = "beginner"
    category: str = "snippet"
    tags: List[str] = []
    is_public: bool = True


class TopicRequest(BaseModel):
    topic: str
    language: str = "JavaScript"


class VisibilityUpdate(BaseModel):
    is_public: bool

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ==============================================================
# AI GENERATION — vocabulary normalization
#
# Gemini doesn't reliably stick to the app's own enums (it tends to return
# "Easy"/"Medium"/"Hard" and free-text categories like "String
# Manipulation"), so the raw model output is normalized against the same
# DIFFICULTY_LEVELS / CATEGORIES the rest of the app already uses (see
# app/models.py) before it's returned to the client. Unknown/unparseable
# values fall back to the same defaults SnippetCreate itself uses.
# ==============================================================

_DIFFICULTY_ALIASES = {
    "easy": "beginner", "beginner": "beginner", "novice": "beginner",
    "medium": "intermediate", "intermediate": "intermediate", "moderate": "intermediate",
    "hard": "advanced", "advanced": "advanced", "difficult": "advanced", "expert": "advanced",
}

_CATEGORY_ALIASES = {
    "algorithm": "algorithm", "algorithms": "algorithm",
    "data structure": "data-structure", "data-structure": "data-structure", "data structures": "data-structure",
    "utility": "utility", "utilities": "utility", "helper": "utility", "helper function": "utility",
    "pattern": "pattern", "design pattern": "pattern", "design patterns": "pattern",
    "snippet": "snippet",
}


def normalize_difficulty(value) -> str:
    key = str(value or "").strip().lower()
    if key in DIFFICULTY_LEVELS:
        return key
    return _DIFFICULTY_ALIASES.get(key, "beginner")


def normalize_category(value) -> str:
    key = str(value or "").strip().lower()
    if key in CATEGORIES:
        return key
    return _CATEGORY_ALIASES.get(key, "other")


def normalize_ai_result(raw_text: str) -> str:
    """Best-effort: parse the JSON object out of the model's raw text, fix up
    difficulty/category, re-serialize. Falls back to the untouched raw text
    if it isn't parseable JSON, so this never breaks the AI feature outright."""
    match = re.search(r"\{[\s\S]*\}", raw_text or "")
    if not match:
        return raw_text
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return raw_text
    if "difficulty" in parsed:
        parsed["difficulty"] = normalize_difficulty(parsed.get("difficulty"))
    if "category" in parsed:
        parsed["category"] = normalize_category(parsed.get("category"))
    return json.dumps(parsed)

if os.getenv("RENDER", "false").lower() != "true":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

def connect_with_retry(retries=5, delay=3):
    for i in range(retries):
        try:
            models.Base.metadata.create_all(bind=engine)
            # create_all() only creates missing tables — it won't add this
            # index to the `snippets` table on a database that already had
            # the table before this index existed (i.e. production, which
            # was seeded before the rotation engine shipped). CREATE INDEX
            # IF NOT EXISTS is supported by both Postgres and SQLite, so this
            # backfills it there while staying a no-op everywhere else.
            with engine.begin() as conn:
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_snippets_public_id ON snippets (is_public, id)"
                ))
            print("✅ DB connected successfully")
            return
        except OperationalError:
            print(f"⏳ DB not ready, retrying ({i+1}/{retries})...")
            time.sleep(delay)
    raise Exception("❌ Could not connect to DB after retries")

connect_with_retry()

# Self-heals a freshly provisioned/empty database (e.g. a new Postgres
# instance after a DB migration) so the daily/random snippet endpoints work
# immediately after deploy without a manual `python seed.py` step. No-ops
# once real data exists — see seed_if_empty's docstring.
with SessionLocal() as _seed_db:
    _seeded_count = seed_if_empty(_seed_db)
    if _seeded_count:
        print(f"🌱 Seeded {_seeded_count} starter snippets (database was empty)")

app = FastAPI(title="DailyCode API")

origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://daily-code-snippet.vercel.app",
    "https://shagunkimothi.github.io",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "dev-session-secret"))

# ==============================================================
# AUTH
# ==============================================================

@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email already registered")
    new_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user); db.commit(); db.refresh(new_user)
    return new_user

@app.post("/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    json_data: dict = Body(None),
    db: Session = Depends(get_db)
):
    email = password = None
    if form_data and form_data.username:
        email, password = form_data.username, form_data.password
    elif json_data:
        email, password = json_data.get("email"), json_data.get("password")
    if not email or not password:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/google/login")
async def google_login(request: Request):
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/auth/google/callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    info  = token.get("userinfo")
    user  = db.query(User).filter(User.email == info["email"]).first()
    if not user:
        user = User(email=info["email"], google_id=info["sub"])
        db.add(user); db.commit(); db.refresh(user)
    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    frontend = os.getenv("FRONTEND_URL", "https://daily-code-snippet.vercel.app")
    return RedirectResponse(f"{frontend}/auth.html?token={jwt_token}")

# ==============================================================
# TAGS
# ==============================================================

@app.get("/tags", response_model=list[TagResponse])
def get_all_tags(db: Session = Depends(get_db)):
    return db.query(Tag).order_by(Tag.name).all()

@app.post("/tags", response_model=TagResponse, status_code=201)
def create_tag(payload: dict = Body(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    name = payload.get("name", "").strip().lower()
    if not name:
        raise HTTPException(400, "Tag name required")
    existing = db.query(Tag).filter(Tag.name == name).first()
    if existing:
        return existing
    tag = Tag(name=name)
    db.add(tag); db.commit(); db.refresh(tag)
    return tag

# ==============================================================
# SNIPPETS
# ==============================================================

@app.get("/snippets/search", response_model=SnippetSearchResponse)
def search_snippets(
    request:    Request,
    q:          str  = Query(None),
    language:   str  = Query(None),
    difficulty: str  = Query(None),
    category:   str  = Query(None),
    tag:        str  = Query(None),
    is_public:  bool = Query(None),
    page:       int  = Query(1, ge=1),
    per_page:   int  = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    from jose import jwt, JWTError
    current_user_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
            current_user_id = int(payload.get("sub", 0))
        except JWTError:
            pass

    query = db.query(Snippet)
    if current_user_id:
        query = query.filter((Snippet.is_public == True) | (Snippet.owner_id == current_user_id))
    else:
        query = query.filter(Snippet.is_public == True)

    if q:
        term  = f"%{q.lower()}%"
        query = query.filter(
            func.lower(Snippet.title).like(term) |
            func.lower(Snippet.code).like(term)  |
            func.lower(Snippet.explanation).like(term)
        )
    if language and language.lower() != "all":
        query = query.filter(func.lower(Snippet.language) == language.lower())
    if difficulty:
        query = query.filter(Snippet.difficulty == difficulty.lower())
    if category:
        query = query.filter(Snippet.category == category.lower())
    if tag:
        query = query.join(snippet_tags).join(Tag).filter(Tag.name == tag.lower())
    if is_public is not None:
        query = query.filter(Snippet.is_public == is_public)

    total   = query.count()
    results = query.order_by(Snippet.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return SnippetSearchResponse(snippets=results, total=total, page=page, per_page=per_page)

def _utc_today():
    """Calendar day used for rotation — explicitly UTC, not server-local
    time, so every user gets the same snippet regardless of their own or
    the host's timezone."""
    return datetime.now(timezone.utc).date()


def _compute_rotation_snippet(db, today):
    """Deterministically pick today's snippet: order all public snippets by
    id (insertion order — stable, no gaps-sensitive numbering to maintain)
    and take the one at position (day_index % total).

    - New public snippets always land at the end of that ordering (higher
      id), so they join the rotation without disturbing anyone else's slot.
    - Deleted/unpublished snippets simply drop out of the WHERE is_public
      clause, so the rotation closes around the gap on its own.
    - `ix_snippets_public_id` (is_public, id) keeps this an index scan even
      as the table grows into the thousands — count and offset both use it.
    - No random() anywhere: same (day, snippet set) always yields the same
      pick, which is what lets it be cached in `daily_snippets` at all.
    """
    total = db.query(func.count(Snippet.id)).filter(Snippet.is_public == True).scalar()
    if not total:
        return None
    offset = today.toordinal() % total
    return (
        db.query(Snippet)
        .filter(Snippet.is_public == True)
        .order_by(Snippet.id.asc())
        .offset(offset)
        .limit(1)
        .first()
    )


@app.get("/snippets/daily", response_model=DailySnippetResponse)
def get_daily_snippet(db: Session = Depends(get_db)):
    today = _utc_today()
    day_str = today.isoformat()
    next_rotation_at = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)

    pin = db.query(DailySnippet).filter(DailySnippet.day == day_str).first()

    # Cache hit: today's pick was already computed (by this request or any
    # other user's, on any instance) and its snippet is still public — every
    # request all day long lands here, a single indexed lookup on `day`.
    if pin and pin.snippet is not None and pin.snippet.is_public:
        snippet = pin.snippet
    else:
        # First request of the UTC day, or the previously pinned snippet was
        # deleted/made private since — (re)compute and persist the pin so
        # subsequent requests today skip straight to the cache-hit path above.
        snippet = _compute_rotation_snippet(db, today)
        if snippet is None:
            raise HTTPException(404, "No public snippets available")

        if pin:
            pin.snippet_id = snippet.id
            db.commit()
        else:
            db.add(DailySnippet(day=day_str, snippet_id=snippet.id))
            try:
                db.commit()
            except IntegrityError:
                # Another concurrent request won the race and inserted first.
                # The algorithm is a pure function of (day, public snippet
                # set), so it computed the same snippet — nothing to do.
                db.rollback()

    # DailySnippetResponse adds fields the ORM object doesn't have, so build
    # it from the base response's dump rather than model_validate(snippet)
    # directly (that would fail validation on the two missing attributes).
    payload = SnippetResponse.model_validate(snippet).model_dump()
    payload["rotation_day"] = day_str
    payload["next_rotation_at"] = next_rotation_at
    return DailySnippetResponse(**payload)

@app.get("/snippets/random", response_model=SnippetResponse)
def get_random_snippet(db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.is_public == True).all()
    if not snippets:
        raise HTTPException(404, "No public snippets available")
    return random.choice(snippets)

@app.get("/snippets/mine", response_model=list[SnippetResponse])
def my_snippets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Snippet).filter(Snippet.owner_id == user.id).order_by(Snippet.id.desc()).all()

@app.get("/snippets/public", response_model=list[SnippetResponse])
def get_public_snippets(db: Session = Depends(get_db)):
    """Guest-facing snippet list — public snippets only, no auth required."""
    return db.query(Snippet).filter(Snippet.is_public == True).order_by(Snippet.id.desc()).all()

@app.get("/snippets/private", response_model=list[SnippetResponse])
def get_private_snippets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Authenticated snippet list — every public snippet plus the caller's
    own private ones, same visibility rule /snippets/search already uses."""
    return db.query(Snippet).filter(
        (Snippet.is_public == True) | (Snippet.owner_id == user.id)
    ).order_by(Snippet.id.desc()).all()

@app.post("/snippets/add")
async def add_snippet(snippet: SnippetCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Handle tags — convert string names to Tag objects
    tag_objects = []
    for tag_name in snippet.tags:
        tag_name = tag_name.strip().lower()
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
            db.flush()  # get the id without committing
        tag_objects.append(tag)

    snippet_data = snippet.dict()
    snippet_data.pop("tags")  # remove raw strings

    new_snippet = Snippet(
        **snippet_data,
        owner_id=user.id,
        created_at=datetime.utcnow(),
        tags=tag_objects  # pass Tag objects instead
    )
    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)
    return {"message": "Snippet added successfully", "id": new_snippet.id}

@app.patch("/snippets/{snippet_id}/visibility")
def update_snippet_visibility(
    snippet_id: int,
    payload: VisibilityUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snippet = db.query(Snippet).filter(Snippet.id == snippet_id).first()
    if not snippet:
        raise HTTPException(404, "Snippet not found")
    if snippet.owner_id != user.id:
        raise HTTPException(403, "Not authorized to modify this snippet")

    snippet.is_public = payload.is_public
    db.commit()
    db.refresh(snippet)
    return {"status": "updated", "is_public": snippet.is_public}

@app.delete("/snippets/{snippet_id}")
def delete_snippet(snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippet = db.query(Snippet).filter(Snippet.id == snippet_id).first()
    if not snippet:
        raise HTTPException(404, "Snippet not found")
    if snippet.owner_id != user.id:
        raise HTTPException(403, "Not authorized to delete this snippet")

    # Favorite rows have no ON DELETE CASCADE at the DB level (unlike
    # snippet_tags, which does) — clean them up explicitly first so this
    # doesn't hit a foreign-key violation on Postgres for favorited snippets.
    db.query(Favorite).filter(Favorite.snippet_id == snippet_id).delete()
    # Same story for daily_snippets: if this snippet happens to be today's
    # pinned rotation pick, null out the pin instead of leaving a dangling FK
    # (this is belt-and-suspenders — get_daily_snippet() already recomputes
    # on read if the pinned snippet turns up deleted/private, but doing it
    # here means the delete itself can't fail on databases created before
    # the ON DELETE SET NULL constraint existed).
    db.query(DailySnippet).filter(DailySnippet.snippet_id == snippet_id).update({"snippet_id": None})
    db.delete(snippet)
    db.commit()
    return {"status": "deleted"}

@app.post("/snippets/generate-ai")
async def generate_ai_snippet(request: TopicRequest, user=Depends(get_current_user)):
    prompt = f"""
    Generate a code snippet for the topic: {request.topic} in {request.language}.
    The code MUST be written in {request.language}.
    Return ONLY a JSON object with these keys:
    "title", "language", "code", "explanation", "difficulty", "category", "tags".
    Set "language" to "{request.language}".
    "difficulty" MUST be exactly one of: {", ".join(DIFFICULTY_LEVELS)}.
    "category" MUST be exactly one of: {", ".join(CATEGORIES)}.
    Do not use markdown code blocks. Return raw JSON only.
    """

    # Try models in order until one works
    models_to_try = [
    "models/gemini-2.0-flash",
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash-001",
]

    last_error = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            if response and response.text:
                print(f"✅ Used model: {model_name}")
                return {"result": normalize_ai_result(response.text)}
        except Exception as e:
            print(f"❌ Model {model_name} failed: {e}")
            last_error = e
            continue

    print(f"GenAI Error: All models failed. Last error: {last_error}")
    raise HTTPException(
        status_code=500,
        detail="AI generation is currently unavailable. Please try again later."
    )

# ==============================================================
# DEBUG — remove this route after confirming which model works
# ==============================================================



# ==============================================================
# FAVORITES
# ==============================================================

@app.get("/favorites/me", response_model=list[SnippetResponse])
def get_my_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(Favorite).filter(Favorite.user_id == user.id).all()
    return [fav.snippet for fav in favs if fav.snippet]

@app.post("/favorites/{snippet_id}", status_code=201)
def add_favorite(snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippet = db.query(Snippet).filter(Snippet.id == snippet_id).first()
    if not snippet:
        raise HTTPException(404, "Snippet not found")
    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.snippet_id == snippet_id
    ).first()
    if existing:
        raise HTTPException(400, "Already favorited")
    db.add(Favorite(user_id=user.id, snippet_id=snippet_id))
    db.add(Activity(action="favorited snippet", snippet_id=snippet_id, user_id=user.id))
    db.commit()
    return {"status": "added"}

@app.delete("/favorites/{snippet_id}")
def remove_favorite(snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.snippet_id == snippet_id
    ).first()
    if not fav:
        raise HTTPException(404, "Favorite not found")
    db.delete(fav)
    db.commit()
    return {"status": "removed"}

# ==============================================================
# HEATMAP
# ==============================================================

@app.get("/heatmap/me", response_model=HeatmapResponse)
def get_heatmap(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    start = today - timedelta(days=364)

    activities = db.query(Activity).filter(
        Activity.user_id  == user.id,
        Activity.timestamp >= datetime.combine(start, datetime.min.time())
    ).all()

    counts: dict[str, int] = defaultdict(int)
    for a in activities:
        day = a.timestamp.date().isoformat()
        counts[day] += 1

    entries = []
    current = start
    while current <= today:
        iso = current.isoformat()
        entries.append(HeatmapEntry(date=iso, count=counts.get(iso, 0)))
        current += timedelta(days=1)

    longest_streak = streak = 0
    for entry in entries:
        if entry.count > 0:
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0

    current_streak = 0
    for entry in reversed(entries):
        if entry.count > 0:
            current_streak += 1
        else:
            break

    total_days_active = sum(1 for e in entries if e.count > 0)

    return HeatmapResponse(
        entries=entries,
        longest_streak=longest_streak,
        current_streak=current_streak,
        total_days_active=total_days_active,
    )

# ==============================================================
# DASHBOARD
# ==============================================================

@app.get("/dashboard/me")
def get_dashboard_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.owner_id == user.id).all()
    recent   = db.query(Snippet).filter(Snippet.owner_id == user.id).order_by(Snippet.id.desc()).limit(5).all()

    lang_stats    = defaultdict(int)
    public_count  = 0
    private_count = 0
    for s in snippets:
        lang_stats[s.language] += 1
        if s.is_public:
            public_count += 1
        else:
            private_count += 1

    week_ago = datetime.utcnow() - timedelta(days=7)
    created_this_week = db.query(Snippet).filter(
        Snippet.owner_id == user.id,
        Snippet.created_at >= week_ago
    ).count()

    return {
        "total_snippets":    len(snippets),
        "public_count":      public_count,
        "private_count":     private_count,
        "favorite_count":    db.query(Favorite).filter(Favorite.user_id == user.id).count(),
        "created_this_week": created_this_week,
        "recent_snippets":   recent,
        "language_stats":    dict(lang_stats),
    }

@app.get("/")
def read_root():
    return {"status": "DailyCode API is running"}