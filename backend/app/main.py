import os
import random
from datetime import date

from fastapi import FastAPI, Depends, HTTPException, status, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

from app.database import engine, get_db
from app.models import User, Snippet, Favorite, Activity
from app.schemas import UserCreate, UserResponse, SnippetCreate, SnippetResponse
from app.security import hash_password, verify_password
from app.auth import create_access_token, oauth
from app.dependencies import get_current_user
from app import models

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Daily Code Snippet API")

# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key="dev-session-secret",
)

# ==========================================================
# AUTH
# ==========================================================

@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email already registered")

    new_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    json_data: dict = Body(None),
    db: Session = Depends(get_db),
):
    email = None
    password = None

    if form_data and form_data.username:
        email = form_data.username
        password = form_data.password
    elif json_data:
        email = json_data.get("email")
        password = json_data.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login credentials",
        )

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get("/auth/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(
        request, "http://127.0.0.1:8000/auth/google/callback"
    )


@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    info = token.get("userinfo")

    user = db.query(User).filter(User.email == info["email"]).first()
    if not user:
        user = User(email=info["email"], google_id=info["sub"])
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(
        {"sub": str(user.id), "email": user.email}
    )

    return RedirectResponse(
        f"http://127.0.0.1:5500/frontend/index.html?token={jwt_token}"
    )

# ==========================================================
# SNIPPETS
# ==========================================================

@app.get("/snippets/public", response_model=list[SnippetResponse])
def public_snippets(db: Session = Depends(get_db)):
    return db.query(Snippet).filter(Snippet.is_public == True).all()


@app.get("/snippets/private", response_model=list[SnippetResponse])
def private_snippets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Snippet).filter(
        (Snippet.is_public == True) | (Snippet.owner_id == user.id)
    ).all()


@app.post("/snippets/add", response_model=SnippetResponse, status_code=201)
def add_snippet(
    snippet: SnippetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_snippet = Snippet(**snippet.dict(), owner_id=user.id)
    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)

    # 🔥 LOG ACTIVITY
    activity = Activity(
        action="created snippet",
        snippet_id=new_snippet.id,
        user_id=user.id
    )
    db.add(activity)
    db.commit()

    return new_snippet


# ==========================================================
# FAVORITES
# ==========================================================

@app.post("/favorites/{snippet_id}")
def add_favorite(
    snippet_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.snippet_id == snippet_id
    ).first()

    if existing:
        return {"message": "Already favorited"}

    fav = Favorite(user_id=user.id, snippet_id=snippet_id)
    db.add(fav)
    db.commit()

    # 🔥 LOG ACTIVITY
    activity = Activity(
        action="favorited snippet",
        snippet_id=snippet_id,
        user_id=user.id
    )
    db.add(activity)
    db.commit()

    return {"message": "Added to favorites"}


@app.delete("/favorites/{snippet_id}")
def remove_favorite(
    snippet_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.snippet_id == snippet_id
    ).first()

    if not fav:
        return {"message": "Not in favorites"}

    db.delete(fav)
    db.commit()

    # 🔥 LOG ACTIVITY
    activity = Activity(
        action="removed favorite",
        snippet_id=snippet_id,
        user_id=user.id
    )
    db.add(activity)
    db.commit()

    return {"message": "Removed from favorites"}


@app.get("/favorites/me", response_model=list[SnippetResponse])
def get_my_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorites = db.query(Snippet).join(Favorite).filter(
        Favorite.user_id == user.id
    ).all()

    return favorites


# ==========================================================
# DAILY & RANDOM
# ==========================================================

@app.get("/snippets/daily", response_model=SnippetResponse)
def get_daily_snippet(db: Session = Depends(get_db)):

    snippets = db.query(Snippet).filter(Snippet.is_public == True).all()

    if not snippets:
        raise HTTPException(status_code=404, detail="No public snippets available")

    today = date.today()
    index = today.toordinal() % len(snippets)

    return snippets[index]


@app.get("/snippets/random", response_model=SnippetResponse)
def get_random_snippet(db: Session = Depends(get_db)):

    snippets = db.query(Snippet).filter(Snippet.is_public == True).all()

    if not snippets:
        raise HTTPException(status_code=404, detail="No public snippets available")

    return random.choice(snippets)


# ==========================================================
# ACTIVITY
# ==========================================================

@app.get("/activities/me")
def get_my_activity(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    activities = db.query(Activity).filter(
        Activity.user_id == user.id
    ).order_by(Activity.timestamp.desc()).limit(5).all()

    return activities
# ==========================================================
# DASHBOARD ANALYTICS
# ==========================================================

from datetime import datetime, timedelta

@app.get("/dashboard/me")
def get_dashboard_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snippets = db.query(Snippet).filter(
        Snippet.owner_id == user.id
    ).all()

    total_snippets = len(snippets)
    public_count = len([s for s in snippets if s.is_public])
    private_count = total_snippets - public_count

    # Favorites count
    favorite_count = db.query(Favorite).filter(
        Favorite.user_id == user.id
    ).count()

    # Most recent snippet
    latest_snippet = db.query(Snippet).filter(
        Snippet.owner_id == user.id
    ).order_by(Snippet.id.desc()).first()

    # Snippets created in last 7 days
    one_week_ago = datetime.utcnow() - timedelta(days=7)

    recent_created = db.query(Activity).filter(
        Activity.user_id == user.id,
        Activity.action == "created snippet",
        Activity.timestamp >= one_week_ago
    ).count()

    return {
        "total_snippets": total_snippets,
        "public_count": public_count,
        "private_count": private_count,
        "favorite_count": favorite_count,
        "latest_snippet": latest_snippet.title if latest_snippet else None,
        "created_this_week": recent_created
    }