import os
from dotenv import load_dotenv
from google import genai
from fastapi import Body, Depends, HTTPException, Query, Request
from app.dependencies import get_current_user
from app.models import User

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

import random
from datetime import date, datetime, timedelta
from collections import defaultdict

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

from app.database import engine, get_db
from app.models import User, Snippet, Favorite, Activity, Tag, snippet_tags
from app.schemas import (
    UserCreate, UserResponse,
    SnippetCreate, SnippetResponse, SnippetSearchResponse,
    HeatmapResponse, HeatmapEntry,
    TagResponse,
)
from app.security import hash_password, verify_password
from app.auth import create_access_token, oauth
from app import models

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Daily Code Snippet API")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(SessionMiddleware, secret_key="dev-session-secret")


# ==========================================================
# AUTH
# ==========================================================

@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email already registered")
    new_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user); db.commit(); db.refresh(new_user)
    return new_user


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), json_data: dict = Body(None), db: Session = Depends(get_db)):
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
    return {"access_token": create_access_token({"sub": str(user.id), "email": user.email}), "token_type": "bearer"}


@app.get("/auth/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, "http://127.0.0.1:8000/auth/google/callback")


@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    info = token.get("userinfo")
    user = db.query(User).filter(User.email == info["email"]).first()
    if not user:
        user = User(email=info["email"], google_id=info["sub"])
        db.add(user); db.commit(); db.refresh(user)
    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    return RedirectResponse(f"http://127.0.0.1:5500/frontend/index.html?token={jwt_token}")


# ==========================================================
# TAGS
# ==========================================================

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


# ==========================================================
# SNIPPETS - SMART SEARCH (must be before /snippets/{id} style routes)
# ==========================================================

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
    from app.auth import SECRET_KEY, ALGORITHM
    from sqlalchemy import func

    # Optional auth to include private snippets
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
        term = f"%{q.lower()}%"
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


@app.get("/snippets/daily", response_model=SnippetResponse)
def get_daily_snippet(db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.is_public == True).all()
    if not snippets:
        raise HTTPException(404, "No public snippets available")
    return snippets[date.today().toordinal() % len(snippets)]


@app.get("/snippets/random", response_model=SnippetResponse)
def get_random_snippet(db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.is_public == True).all()
    if not snippets:
        raise HTTPException(404, "No public snippets available")
    return random.choice(snippets)


@app.get("/snippets/public", response_model=list[SnippetResponse])
def public_snippets(db: Session = Depends(get_db)):
    return db.query(Snippet).filter(Snippet.is_public == True).all()


@app.get("/snippets/private", response_model=list[SnippetResponse])
def private_snippets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Snippet).filter((Snippet.is_public == True) | (Snippet.owner_id == user.id)).all()


@app.get("/snippets/mine", response_model=list[SnippetResponse])
def my_snippets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns only snippets created by the logged-in user, newest first."""
    return db.query(Snippet).filter(Snippet.owner_id == user.id).order_by(Snippet.id.desc()).all()


@app.delete("/snippets/{snippet_id}", status_code=204)
def delete_snippet(snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a snippet — only the owner can delete."""
    snippet = db.query(Snippet).filter(Snippet.id == snippet_id, Snippet.owner_id == user.id).first()
    if not snippet:
        raise HTTPException(404, "Snippet not found or not yours")
    db.delete(snippet)
    db.commit()
    return


@app.post("/snippets/add", response_model=SnippetResponse, status_code=201)
def add_snippet(snippet: SnippetCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippet_data = snippet.dict(exclude={"tags"})
    new_snippet  = Snippet(**snippet_data, owner_id=user.id)

    for tag_name in snippet.tags:
        name = tag_name.strip().lower()
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        new_snippet.tags.append(tag)

    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)
    db.add(Activity(action="created snippet", snippet_id=new_snippet.id, user_id=user.id))
    db.commit()
    return new_snippet


@app.post("/snippets/generate-ai")
async def generate_ai(payload: dict = Body(...), user: User = Depends(get_current_user)):
    topic = payload.get("topic")
    if not topic:
        raise HTTPException(400, "Topic is required")
    prompt = (
        f"Generate a code snippet for: {topic}. "
        "Return ONLY a valid JSON object with these exact keys: "
        "'title', 'language', 'code', 'explanation', "
        "'difficulty' (beginner|intermediate|advanced), "
        "'category' (algorithm|data-structure|utility|pattern|snippet|other), "
        "'tags' (array of 1-4 short lowercase tag strings)."
    )
    try:
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "")
        return {"result": raw}
    except Exception as e:
        raise HTTPException(500, str(e))




@app.patch("/snippets/{snippet_id}/visibility", response_model=SnippetResponse)
def toggle_visibility(snippet_id: int, payload: dict = Body(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Toggle a snippet between public and private. Only the owner can do this."""
    snippet = db.query(Snippet).filter(Snippet.id == snippet_id, Snippet.owner_id == user.id).first()
    if not snippet:
        raise HTTPException(404, "Snippet not found or not yours")
    snippet.is_public = payload.get("is_public", not snippet.is_public)
    db.commit()
    db.refresh(snippet)
    db.add(Activity(action="updated visibility", snippet_id=snippet.id, user_id=user.id))
    db.commit()
    return snippet

# ==========================================================
# FAVORITES
# ==========================================================

@app.get("/favorites/me", response_model=list[SnippetResponse])
def get_my_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Snippet).join(Favorite).filter(Favorite.user_id == user.id).all()


@app.post("/favorites/{snippet_id}")
def add_favorite(snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.snippet_id == snippet_id).first():
        return {"message": "Already favorited"}
    db.add(Favorite(user_id=user.id, snippet_id=snippet_id))
    db.add(Activity(action="favorited snippet", snippet_id=snippet_id, user_id=user.id))
    db.commit()
    return {"message": "Added to favorites"}


@app.delete("/favorites/{snippet_id}")
def remove_favorite(snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.snippet_id == snippet_id).first()
    if not fav:
        return {"message": "Not in favorites"}
    db.delete(fav)
    db.add(Activity(action="removed favorite", snippet_id=snippet_id, user_id=user.id))
    db.commit()
    return {"message": "Removed from favorites"}


# ==========================================================
# ACTIVITY HEATMAP
# ==========================================================

@app.get("/heatmap/me", response_model=HeatmapResponse)
def get_my_heatmap(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=365)
    activities = db.query(Activity).filter(Activity.user_id == user.id, Activity.timestamp >= since).all()

    counts = defaultdict(int)
    for a in activities:
        counts[a.timestamp.strftime("%Y-%m-%d")] += 1

    today   = date.today()
    entries = [
        HeatmapEntry(date=(today - timedelta(days=i)).strftime("%Y-%m-%d"),
                     count=counts.get((today - timedelta(days=i)).strftime("%Y-%m-%d"), 0))
        for i in range(364, -1, -1)
    ]

    # Streak calculation
    current_streak = longest_streak = streak = 0
    streak_broken  = False
    for entry in reversed(entries):
        if entry.count > 0:
            streak += 1
            longest_streak = max(longest_streak, streak)
            if not streak_broken:
                current_streak = streak
        else:
            streak_broken = True
            streak = 0

    return HeatmapResponse(
        entries=entries,
        longest_streak=longest_streak,
        current_streak=current_streak,
        total_days_active=sum(1 for e in entries if e.count > 0),
    )


# ==========================================================
# ACTIVITIES
# ==========================================================

@app.get("/activities/me")
def get_my_activity(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Activity).filter(Activity.user_id == user.id).order_by(Activity.timestamp.desc()).limit(5).all()


# ==========================================================
# DASHBOARD
# ==========================================================

@app.get("/dashboard/me")
def get_dashboard_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.owner_id == user.id).all()
    total    = len(snippets)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent   = db.query(Snippet).filter(Snippet.owner_id == user.id).order_by(Snippet.id.desc()).limit(5).all()

    # Language stats
    lang_stats = defaultdict(int)
    for s in snippets:
        lang_stats[s.language] += 1

    return {
        "total_snippets":    total,
        "public_count":      sum(1 for s in snippets if s.is_public),
        "private_count":     sum(1 for s in snippets if not s.is_public),
        "favorite_count":    db.query(Favorite).filter(Favorite.user_id == user.id).count(),
        "latest_snippet":    recent[0].title if recent else None,
        "created_this_week": db.query(Activity).filter(
            Activity.user_id == user.id,
            Activity.action == "created snippet",
            Activity.timestamp >= week_ago
        ).count(),
        "recent_snippets": [
            {
                "id": s.id,
                "title": s.title,
                "language": s.language,
                "is_public": s.is_public,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in recent
        ],
        "language_stats": dict(lang_stats),
    }