from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware # Added for OAuth sessions
import os
from dotenv import load_dotenv

load_dotenv()


from .database import engine, get_db
from .models import Base, User, Snippet
from .schemas import (
    UserCreate,
    UserResponse,
    SnippetCreate,
    SnippetResponse,
)
from .security import hash_password, verify_password
from .auth import create_access_token, oauth # Import oauth from auth.py
from .dependencies import get_current_user

# =========================
# DATABASE
# =========================
Base.metadata.create_all(bind=engine)

# =========================
# APP
# =========================
app = FastAPI(title="Daily Code Snippet API")

# =========================
# MIDDLEWARE
# =========================

# Added SessionMiddleware: Required for Google OAuth to track login state
# ✅ CORS MUST COME FIRST
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Session middleware AFTER
app.add_middleware(
    SessionMiddleware,
    secret_key="any-random-secret-string"
)


# =========================
# HEALTH
# =========================
@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}

# =========================
# SNIPPETS (PUBLIC)
# =========================
@app.post("/snippets")
def create_snippet(
    snippet: SnippetCreate,
    db: Session = Depends(get_db),
):
    new_snippet = Snippet(**snippet.dict())
    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)
    return {"message": "Snippet created", "id": new_snippet.id}

@app.get("/snippets", response_model=list[SnippetResponse])
def get_snippets(db: Session = Depends(get_db)):
    return db.query(Snippet).all()

# =========================
# AUTH (Existing & Google)
# =========================

# Added Google Login Route
@app.get("/auth/google/login")
async def google_login(request: Request):
    # This redirects the user to Google's login page
    redirect_uri = "http://127.0.0.1:8000/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

# Added Google Callback Route
@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    from fastapi.responses import RedirectResponse
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Google authentication failed")

        email = user_info.get("email")
        google_id = user_info.get("sub")

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create new user for Google login
            user = User(
                email=email,
                google_id=google_id,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )

        # Redirect back to frontend with the token in the URL
        return RedirectResponse(url=f"http://127.0.0.1:5500/frontend/index.html?token={access_token}")
    
    except Exception as e:
        return RedirectResponse(url="http://127.0.0.1:5500/frontend/auth.html?error=google_failed")

@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

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
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }

# =========================
# PROTECTED
# =========================
@app.get("/snippets/private")
def private_snippets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Snippet).all()

@app.get("/snippets/public", response_model=list[SnippetResponse])
def get_public_snippets(db: Session = Depends(get_db)):
    return db.query(Snippet).all()