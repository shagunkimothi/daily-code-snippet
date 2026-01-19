from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .database import engine, get_db
from .models import Base, User, Snippet
from .schemas import (
    UserCreate,
    UserResponse,
    SnippetCreate,
    SnippetResponse,
)
from .security import hash_password, verify_password
from .auth import create_access_token
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
# CORS
# =========================
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
# AUTH
# =========================
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
    # For now: return all snippets
    # Later you can filter "public only"
    return db.query(Snippet).all()
