import os
import random
import traceback
import time
from collections import defaultdict
from datetime import date, datetime, timedelta
from dotenv import load_dotenv
from google import genai

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

from app.auth import ALGORITHM, SECRET_KEY, create_access_token, oauth
from app.database import engine, get_db
from app.dependencies import get_current_user
from app.models import Activity, Favorite, Snippet, Tag, User, snippet_tags
from app.schemas import (
    HeatmapEntry, HeatmapResponse,
    SnippetCreate, SnippetResponse, SnippetSearchResponse,
    TagResponse, UserCreate, UserResponse,
)
from app.security import hash_password, verify_password
from app import models

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ✅ Fixed: os.getenv("RENDER") returns string "false" which is truthy.
# Now we explicitly check for the string "true".
if os.getenv("RENDER", "false").lower() != "true":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

def connect_with_retry(retries=5, delay=3):
    for i in range(retries):
        try:
            models.Base.metadata.create_all(bind=engine)
            print("✅ DB connected successfully")
            return
        except OperationalError:
            print(f"⏳ DB not ready, retrying ({i+1}/{retries})...")
            time.sleep(delay)
    raise Exception("❌ Could not connect to DB after retries")

connect_with_retry()
app = FastAPI(title="DailyCode API")

origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://daily-code-snippet.vercel.app",
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
    token   = await oauth.google.authorize_access_token(request)
    info    = token.get("userinfo")
    user    = db.query(User).filter(User.email == info["email"]).first()
    if not user:
        user = User(email=info["email"], google_id=info["sub"])
        db.add(user); db.commit(); db.refresh(user)
    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    
    frontend = os.getenv("FRONTEND_URL", "https://daily-code-snippet.vercel.app")
    return RedirectResponse(f"{frontend}/auth.html?token={jwt_token}")
    # ✅ Fixed: redirects to auth.html so auth.js can pick up the token
    # and then redirect to index.html cleanly

# ==============================================================
# TAGS & SNIPPETS
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

@app.get("/snippets/daily", response_model=SnippetResponse)
def get_daily_snippet(db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.is_public == True).order_by(Snippet.id).all()
    if not snippets:
        raise HTTPException(404, "No public snippets available")
    total     = len(snippets)
    cycle     = max(total, 15)
    day_index = date.today().toordinal()
    return snippets[day_index % cycle % total]

@app.get("/snippets/random", response_model=SnippetResponse)
def get_random_snippet(db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.is_public == True).all()
    if not snippets:
        raise HTTPException(404, "No public snippets available")
    return random.choice(snippets)

@app.get("/snippets/mine", response_model=list[SnippetResponse])
def my_snippets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Snippet).filter(Snippet.owner_id == user.id).order_by(Snippet.id.desc()).all()

@app.post("/snippets/add", response_model=SnippetResponse, status_code=201)
def add_snippet(snippet: SnippetCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippet_data = snippet.dict(exclude={"tags"})
    new_snippet  = Snippet(**snippet_data, owner_id=user.id)
    for tag_name in snippet.tags:
        name = tag_name.strip().lower()
        if not name: continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag); db.flush()
        new_snippet.tags.append(tag)
    db.add(new_snippet); db.commit(); db.refresh(new_snippet)
    db.add(Activity(action="created snippet", snippet_id=new_snippet.id, user_id=user.id))
    db.commit()
    return new_snippet

@app.post("/snippets/generate-ai")
async def generate_ai(payload: dict = Body(...), user: User = Depends(get_current_user)):
    topic = payload.get("topic")
    if not topic: raise HTTPException(400, "Topic is required")
    prompt = (
        f"Generate a code snippet for: {topic}. "
        "Return ONLY a valid JSON object with: 'title', 'language', 'code', 'explanation', 'difficulty', 'category', 'tags'."
    )
    try:
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "")
        return {"result": raw}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.get("/dashboard/me")
def get_dashboard_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    snippets = db.query(Snippet).filter(Snippet.owner_id == user.id).all()
    recent   = db.query(Snippet).filter(Snippet.owner_id == user.id).order_by(Snippet.id.desc()).limit(5).all()
    lang_stats = defaultdict(int)
    for s in snippets: lang_stats[s.language] += 1
    return {
        "total_snippets": len(snippets),
        "favorite_count": db.query(Favorite).filter(Favorite.user_id == user.id).count(),
        "recent_snippets": recent,
        "language_stats": dict(lang_stats),
    }

@app.get("/")
def read_root():
    return {"status": "DailyCode API is running"}