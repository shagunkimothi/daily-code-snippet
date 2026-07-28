import json
import os
import random
import re
import traceback
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional

from fastapi import BackgroundTasks, Body, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

from app.auth import ALGORITHM, SECRET_KEY, create_access_token, oauth
from app.database import SessionLocal, engine, get_db
from app.dependencies import get_current_user
from app.email import send_email
from app.email_templates import reminder_email_html, welcome_email_html
from app.models import (
    Activity, CATEGORIES, DailySnippet, DIFFICULTY_LEVELS, Favorite,
    ReminderSettings, Snippet, Tag, Topic, User, snippet_tags,
)
from app.schemas import (
    AnalyticsResponse, CategoryCount,
    DailySnippetResponse,
    HeatmapEntry, HeatmapResponse,
    MonthlyActivityPoint,
    PasswordChangeRequest,
    RecommendationsResponse, RecommendedSnippet,
    REMINDER_FREQUENCIES, ReminderSettingsResponse, ReminderSettingsUpdate,
    SnippetResponse, SnippetSearchResponse,
    TagResponse, TopicResponse, TopicsUpdate,
    UserCreate, UserMeResponse, UserResponse,
    WeeklyActivityPoint,
)
from app.security import hash_password, verify_password
from app.seed_data import seed_if_empty
from app.topics_seed import seed_topics_if_empty
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

def _ensure_user_columns(conn):
    """create_all() only creates missing *tables* — it never ALTERs an
    existing one, so a `users` table that predates the learning-platform
    columns (created_at, welcome_email_sent_at, onboarding_completed) needs
    them backfilled explicitly. Checked via inspection rather than
    `ADD COLUMN IF NOT EXISTS` because SQLite doesn't support that syntax
    (Postgres does), so this stays portable across both."""
    existing = {c["name"] for c in inspect(conn).get_columns("users")}
    if "created_at" not in existing:
        conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP"))
    if "welcome_email_sent_at" not in existing:
        conn.execute(text("ALTER TABLE users ADD COLUMN welcome_email_sent_at TIMESTAMP"))
    if "onboarding_completed" not in existing:
        conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE"))

def connect_with_retry(retries=5, delay=3):
    for i in range(retries):
        try:
            models.Base.metadata.create_all(bind=engine)
            with engine.begin() as conn:
                # create_all() only creates missing tables — it won't add this
                # index to the `snippets` table on a database that already had
                # the table before this index existed (i.e. production, which
                # was seeded before the rotation engine shipped). CREATE INDEX
                # IF NOT EXISTS is supported by both Postgres and SQLite, so this
                # backfills it there while staying a no-op everywhere else.
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_snippets_public_id ON snippets (is_public, id)"
                ))
                _ensure_user_columns(conn)
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
    _seeded_topics = seed_topics_if_empty(_seed_db)
    if _seeded_topics:
        print(f"🌱 Seeded {_seeded_topics} learning topics (database was empty)")

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

def _send_welcome_email_once(user: User, db: Session, background_tasks: BackgroundTasks):
    """Guards the "send exactly once" requirement: marks
    welcome_email_sent_at immediately — before the background task even
    runs — so a retried request or (for Google) a returning existing user
    hitting the callback again can never queue a second send. Marked
    regardless of whether the send itself later succeeds: retrying a
    failed send would need a queue/worker, which is more machinery than a
    single welcome email is worth — the tradeoff is a rare missed email
    over a guaranteed no-duplicate.
    """
    if user.welcome_email_sent_at:
        return
    user.welcome_email_sent_at = datetime.utcnow()
    db.commit()
    frontend_url = os.getenv("FRONTEND_URL", "https://daily-code-snippet.vercel.app")
    background_tasks.add_task(
        send_email, user.email, "Welcome to DailyCode", welcome_email_html(frontend_url)
    )

@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email already registered")
    new_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user); db.commit(); db.refresh(new_user)
    _send_welcome_email_once(new_user, db, background_tasks)
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
async def google_callback(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    info  = token.get("userinfo")
    user  = db.query(User).filter(User.email == info["email"]).first()
    if not user:
        user = User(email=info["email"], google_id=info["sub"])
        db.add(user); db.commit(); db.refresh(user)
    _send_welcome_email_once(user, db, background_tasks)
    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    frontend = os.getenv("FRONTEND_URL", "https://daily-code-snippet.vercel.app")
    # /login (not /auth.html) — AuthContext's token-handoff effect reads the
    # ?token= query param on whatever route it lands on, so this only needs
    # to be a route that actually exists in the SPA's router.
    return RedirectResponse(f"{frontend}/login?token={jwt_token}")

# ==============================================================
# USER PROFILE / PREFERENCES
# ==============================================================
# Backs /users/me (replaces Profile.jsx's old JWT-decode workaround), the
# onboarding wizard (topics + reminders + a completion flag), and the
# Settings page's Account/Security section.

@app.get("/users/me", response_model=UserMeResponse)
def get_me(user: User = Depends(get_current_user)):
    rs = user.reminder_settings
    return UserMeResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        onboarding_completed=user.onboarding_completed,
        has_password=bool(user.hashed_password),
        topics=user.topics,
        reminder_settings=ReminderSettingsResponse(
            frequency=rs.frequency if rs else "none",
            timezone=rs.timezone if rs else "UTC",
        ),
    )

@app.get("/topics", response_model=list[TopicResponse])
def list_topics(db: Session = Depends(get_db)):
    return db.query(Topic).order_by(Topic.id).all()

@app.post("/users/me/topics")
def update_my_topics(payload: TopicsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Set-replace, not append — repeating the same request (e.g. a retry)
    # can't accumulate duplicate selections or drift from what's on screen.
    topics = db.query(Topic).filter(Topic.id.in_(payload.topic_ids)).all()
    user.topics = topics
    db.commit()
    return {"status": "updated", "topic_ids": [t.id for t in topics]}

@app.get("/users/me/reminders", response_model=ReminderSettingsResponse)
def get_my_reminders(user: User = Depends(get_current_user)):
    rs = user.reminder_settings
    if not rs:
        return ReminderSettingsResponse(frequency="none", timezone="UTC")
    return ReminderSettingsResponse(frequency=rs.frequency, timezone=rs.timezone)

@app.post("/users/me/reminders", response_model=ReminderSettingsResponse)
def update_my_reminders(
    payload: ReminderSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.frequency not in REMINDER_FREQUENCIES:
        raise HTTPException(422, f"frequency must be one of {REMINDER_FREQUENCIES}")
    rs = user.reminder_settings
    if not rs:
        rs = ReminderSettings(user_id=user.id)
        db.add(rs)
    rs.frequency = payload.frequency
    rs.timezone = payload.timezone
    db.commit()
    return ReminderSettingsResponse(frequency=rs.frequency, timezone=rs.timezone)

@app.post("/users/me/onboarding/complete")
def complete_onboarding(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.onboarding_completed = True
    db.commit()
    return {"status": "completed"}

@app.post("/users/me/password")
def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.hashed_password:
        raise HTTPException(400, "This account signs in with Google and has no password to change.")
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(401, "Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(422, "New password must be at least 6 characters")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"status": "password updated"}

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

def _optional_current_user_id(request: Request) -> int | None:
    """Best-effort auth check for endpoints that behave differently for a
    logged-in user but must still work for guests (search, daily-snippet
    view logging) — returns None instead of raising on a missing/invalid/
    expired token, unlike get_current_user()'s hard 401."""
    from jose import jwt, JWTError
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub", 0)) or None
    except JWTError:
        return None

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
    current_user_id = _optional_current_user_id(request)

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


def _log_daily_view_once(request: Request, db: Session, snippet_id: int):
    """Logs one "viewed_daily_snippet" Activity per authenticated user per
    UTC day — this is what makes /heatmap/me and /analytics/me reflect
    actual reading instead of only favoriting. `snippet_id` is recorded so
    analytics can later aggregate by category/language. Guests (no valid
    token) aren't tracked; a page refresh within the same day doesn't
    inflate the count (checked before inserting). Never lets a logging
    failure break the actual "show me today's snippet" response."""
    try:
        user_id = _optional_current_user_id(request)
        if not user_id:
            return
        today_start = datetime.combine(_utc_today(), datetime.min.time())
        already_logged = db.query(Activity).filter(
            Activity.user_id == user_id,
            Activity.action == "viewed_daily_snippet",
            Activity.timestamp >= today_start,
        ).first()
        if already_logged:
            return
        db.add(Activity(action="viewed_daily_snippet", user_id=user_id, snippet_id=snippet_id))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[activity] failed to log viewed_daily_snippet: {e}")

@app.get("/snippets/daily", response_model=DailySnippetResponse)
def get_daily_snippet(request: Request, db: Session = Depends(get_db)):
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

    _log_daily_view_once(request, db, snippet.id)

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

@app.get("/snippets/{snippet_id}", response_model=SnippetResponse)
def get_snippet(snippet_id: int, db: Session = Depends(get_db)):
    """Public-only by design — the one current caller (clicking through a
    recommendation) only ever references public snippet IDs to begin with,
    so this doesn't need to handle the private/owner-only case MySnippets
    already covers via /snippets/mine."""
    snippet = db.query(Snippet).filter(Snippet.id == snippet_id, Snippet.is_public == True).first()
    if not snippet:
        raise HTTPException(404, "Snippet not found")
    return snippet

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
# ANALYTICS — richer, separate from /dashboard/me + /heatmap/me
# (neither of which changes) so the existing Dashboard keeps working
# untouched. Sourced entirely from `activities` (the "viewed_daily_snippet"
# events logged in get_daily_snippet) + favorites/topics already on `user`.
# ==============================================================

def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())  # Monday of that ISO week

@app.get("/analytics/me", response_model=AnalyticsResponse)
def get_my_analytics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    window_start = today - timedelta(days=364)
    window_start_dt = datetime.combine(window_start, datetime.min.time())

    views = db.query(Activity).filter(
        Activity.user_id == user.id,
        Activity.action == "viewed_daily_snippet",
        Activity.timestamp >= window_start_dt,
    ).all()

    # --- streak: identical algorithm to /heatmap/me (see that endpoint),
    # just sourced from real-read events instead of only favorites. Shares
    # the same "resets to 0 until today's snippet is actually opened"
    # characteristic as the existing heatmap — reused deliberately for
    # consistency between the two, not a new quirk introduced here.
    counts_by_day: dict[date, int] = defaultdict(int)
    for a in views:
        counts_by_day[a.timestamp.date()] += 1

    longest_streak = streak = 0
    total_active_days = 0
    d = window_start
    while d <= today:
        if counts_by_day.get(d, 0) > 0:
            streak += 1
            longest_streak = max(longest_streak, streak)
            total_active_days += 1
        else:
            streak = 0
        d += timedelta(days=1)

    current_streak = 0
    d = today
    while counts_by_day.get(d, 0) > 0:
        current_streak += 1
        d -= timedelta(days=1)

    # --- snippets completed + category distribution + avg reading time ---
    viewed_snippet_ids = {a.snippet_id for a in views if a.snippet_id}
    viewed_snippets = (
        db.query(Snippet).filter(Snippet.id.in_(viewed_snippet_ids)).all()
        if viewed_snippet_ids else []
    )

    category_counts: dict[str, int] = defaultdict(int)
    for s in viewed_snippets:
        category_counts[s.category or "other"] += 1
    category_distribution = [
        CategoryCount(category=c, count=n)
        for c, n in sorted(category_counts.items(), key=lambda kv: -kv[1])
    ]
    favorite_category = category_distribution[0].category if category_distribution else None

    average_learning_time = (
        round(sum(s.reading_time_minutes for s in viewed_snippets) / len(viewed_snippets), 1)
        if viewed_snippets else 0.0
    )

    # --- weekly (last 8 weeks) / monthly (last 6 months) activity ---
    weekly_counts: dict[date, int] = defaultdict(int)
    monthly_counts: dict[str, int] = defaultdict(int)
    for a in views:
        weekly_counts[_week_start(a.timestamp.date())] += 1
        monthly_counts[a.timestamp.strftime("%Y-%m")] += 1

    weekly_activity = [
        WeeklyActivityPoint(
            week_start=(_week_start(today) - timedelta(weeks=i)).isoformat(),
            count=weekly_counts.get(_week_start(today) - timedelta(weeks=i), 0),
        )
        for i in range(7, -1, -1)
    ]

    monthly_activity = []
    for i in range(5, -1, -1):
        year, month = today.year, today.month - i
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year}-{month:02d}"
        monthly_activity.append(MonthlyActivityPoint(month=key, count=monthly_counts.get(key, 0)))

    # --- trend: last 2 weeks vs. the 2 weeks before that ---
    this_period = sum(weekly_counts.get(_week_start(today) - timedelta(weeks=i), 0) for i in range(0, 2))
    prev_period = sum(weekly_counts.get(_week_start(today) - timedelta(weeks=i), 0) for i in range(2, 4))
    if prev_period == 0:
        learning_trend_pct = 100.0 if this_period > 0 else 0.0
    else:
        learning_trend_pct = round((this_period - prev_period) / prev_period * 100, 1)

    # --- reading consistency: active days / days since signup ---
    if user.created_at:
        days_since_signup = max((today - user.created_at.date()).days, 1)
    else:
        # Pre-migration users have no created_at (added after they signed
        # up) — falling back to the full 365-day window avoids a
        # divide-by-zero and avoids overstating consistency for an unknown
        # (possibly much longer) actual tenure.
        days_since_signup = 365
    reading_consistency_pct = round(min(total_active_days / days_since_signup * 100, 100.0), 1)

    return AnalyticsResponse(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_active_days=total_active_days,
        snippets_completed=len(viewed_snippet_ids),
        favorites_count=db.query(Favorite).filter(Favorite.user_id == user.id).count(),
        weekly_activity=weekly_activity,
        monthly_activity=monthly_activity,
        category_distribution=category_distribution,
        favorite_category=favorite_category,
        reading_consistency_pct=reading_consistency_pct,
        average_learning_time_minutes=average_learning_time,
        preferred_topics=[t.name for t in user.topics],
        learning_trend_pct=learning_trend_pct,
    )

# ==============================================================
# RECOMMENDATIONS — v1 rule-based, computed on request. No new table
# yet (see the plan / module docstring below on exactly where a
# `recommendations` table slots in later without changing this response
# shape, once generation moves to an LLM call).
# ==============================================================

# Loose synonym map for topics that don't literally equal a snippet's
# language/category/tag strings (e.g. "DSA" vs the actual category values
# "algorithm"/"data-structure"). Deliberately a small Python dict, not a
# DB-backed mapping table — the plan defers a rigid FK-based mapping until
# loose matching actually proves insufficient, and today's seed content
# skews toward general algorithms/JS/Python rather than infra/framework
# topics, so most of these aliases are aspirational until more varied
# content exists.
TOPIC_MATCH_ALIASES = {
    "dsa":            {"algorithm", "data-structure"},
    "system design":  {"pattern", "system-design", "architecture"},
    "devops":         {"docker", "kubernetes", "utility", "ci-cd"},
    "frontend":       {"javascript", "typescript", "css", "html", "react"},
}

def _snippet_topic_keys(snippet) -> set:
    keys = {(snippet.language or "").lower(), (snippet.category or "").lower()}
    keys.update(t.name.lower() for t in snippet.tags)
    return keys

def _topic_matches_snippet(topic_name: str, snippet_keys: set) -> bool:
    needle = topic_name.lower()
    if needle in snippet_keys:
        return True
    return bool(TOPIC_MATCH_ALIASES.get(needle, set()) & snippet_keys)

@app.get("/recommendations/me", response_model=RecommendationsResponse)
def get_my_recommendations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = _utc_today()
    todays_snippet = _compute_rotation_snippet(db, today)
    todays_id = todays_snippet.id if todays_snippet else None

    viewed_ids = {
        a.snippet_id
        for a in db.query(Activity).filter(
            Activity.user_id == user.id, Activity.action == "viewed_daily_snippet"
        ).all()
        if a.snippet_id
    }

    favorited_snippets = [
        f.snippet for f in db.query(Favorite).filter(Favorite.user_id == user.id).all() if f.snippet
    ]
    favorited_tag_names = {t.name.lower() for s in favorited_snippets for t in s.tags}
    topic_names = [t.name for t in user.topics]

    # Loads every public snippet to score them — fine at the current
    # (seed-data) scale, but this is the same class of "fetch everything
    # into Python" query the daily-rotation engine deliberately avoided for
    # scalability (see _compute_rotation_snippet's docstring). Ranking by
    # score isn't reducible to a single indexed SQL query the way the
    # rotation's simple offset pick is, so this is an accepted v1 tradeoff —
    # exactly the kind of cost an AI/precomputed-table v2 (nightly batch
    # job, same mechanism as reminders) naturally resolves by not doing
    # this work synchronously per request at all.
    candidates = [
        s for s in db.query(Snippet).filter(Snippet.is_public == True).all()
        if s.id not in viewed_ids and s.id != todays_id
    ]

    scored = []
    for s in candidates:
        keys = _snippet_topic_keys(s)
        score = 0
        if any(_topic_matches_snippet(t, keys) for t in topic_names):
            score += 2
        if favorited_tag_names & keys:
            score += 1
        if score > 0:
            scored.append((score, s, keys))
    scored.sort(key=lambda triple: (-triple[0], triple[1].id))

    def _reason_for(s, keys):
        matched = [t for t in topic_names if _topic_matches_snippet(t, keys)]
        if matched:
            return f"Matches your interest in {matched[0]}"
        return "Related to snippets you've favorited"

    def _to_recommended(s, keys):
        return RecommendedSnippet(
            id=s.id, title=s.title, language=s.language,
            category=s.category or "other", difficulty=s.difficulty or "beginner",
            reason=_reason_for(s, keys),
        )

    next_snippet = _to_recommended(scored[0][1], scored[0][2]) if scored else None
    related_snippets = [_to_recommended(s, keys) for _, s, keys in scored[1:5]]

    explored_keys = set()
    if viewed_ids:
        for s in db.query(Snippet).filter(Snippet.id.in_(viewed_ids)).all():
            explored_keys |= _snippet_topic_keys(s)
    suggested_topics = [t for t in topic_names if not _topic_matches_snippet(t, explored_keys)]

    return RecommendationsResponse(
        next_snippet=next_snippet,
        suggested_topics=suggested_topics,
        related_snippets=related_snippets,
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

# ==============================================================
# REMINDERS — cron-triggered fan-out, not user-facing
# ==============================================================

REMINDER_HOUR_TARGETS = {
    "daily_morning":   8,
    "daily_afternoon": 14,
    "daily_evening":   19,
}

@app.post("/internal/reminders/run")
def run_reminders(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Meant to be hit once an hour by an external scheduler (a Render Cron
    Job — there's no persistent worker process on Render's free web-service
    tier, so an in-process scheduler like APScheduler would be unreliable
    there). Never reachable with a user JWT — a separate shared-secret
    header, checked before any DB work.

    For each opted-in user, converts "now" to THEIR local time (captured at
    onboarding via the browser's IANA timezone) and checks whether the
    current local hour matches their chosen window. Runs once an hour, and
    each user matches at most one hour a day (or one hour a week for
    weekly_summary), so there's no separate "already sent today" log yet —
    a cron double-fire within the same hour would double-send. Accepted as
    a v1 simplification; worth a dedupe table if that ever actually happens.

    weekly_summary currently reuses the same daily-snippet content as the
    daily reminders — a real week-in-review email (streak, snippets read,
    category breakdown) is a natural follow-up once the analytics endpoint
    (Phase 6) exists to source it from.
    """
    expected_secret = os.getenv("CRON_SECRET")
    if not expected_secret or request.headers.get("X-Cron-Secret") != expected_secret:
        raise HTTPException(401, "Unauthorized")

    snippet = _compute_rotation_snippet(db, _utc_today())
    if not snippet:
        return {"checked": 0, "sent": 0, "note": "no public snippets available"}

    rows = db.query(ReminderSettings).filter(ReminderSettings.frequency != "none").all()
    sent = 0
    for rs in rows:
        try:
            local_now = datetime.now(ZoneInfo(rs.timezone))
        except Exception as e:
            # Unknown/invalid IANA name (shouldn't happen — captured
            # automatically at onboarding) OR the `tzdata` package is
            # missing (zoneinfo has no built-in database on Windows, and
            # some minimal Linux images strip system tzdata too — see
            # requirements.txt). Either way, one bad zone must not crash
            # the whole run for every other user — but it's logged, not
            # silently swallowed, since it means that user's reminder time
            # is silently wrong until this is fixed.
            print(f"[reminders] ZoneInfo('{rs.timezone}') failed for user {rs.user_id}: {e}")
            local_now = datetime.now(timezone.utc)

        if rs.frequency == "weekly_summary":
            is_match = local_now.weekday() == 0 and local_now.hour == REMINDER_HOUR_TARGETS["daily_morning"]
        else:
            is_match = local_now.hour == REMINDER_HOUR_TARGETS.get(rs.frequency)

        if not is_match:
            continue

        user = db.query(User).filter(User.id == rs.user_id).first()
        if not user:
            continue

        frontend_url = os.getenv("FRONTEND_URL", "https://daily-code-snippet.vercel.app")
        background_tasks.add_task(
            send_email, user.email, "Today's DailyCode snippet",
            reminder_email_html(snippet, frontend_url),
        )
        sent += 1

    return {"checked": len(rows), "sent": sent}

@app.get("/")
def read_root():
    return {"status": "DailyCode API is running"}