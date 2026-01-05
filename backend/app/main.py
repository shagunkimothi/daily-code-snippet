from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from .security import hash_password
from .models import User
from .schemas import UserCreate, UserResponse
from .security import verify_password
from .schemas import UserLogin



from .database import engine, get_db
from .models import Base, Snippet
from .schemas import SnippetCreate, SnippetResponse

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="Daily Code Snippet API")

# =========================
# CORS CONFIGURATION
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ROUTES
# =========================

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/snippets")
def create_snippet(
    snippet: SnippetCreate,
    db: Session = Depends(get_db)
):
    new_snippet = Snippet(
        title=snippet.title,
        language=snippet.language,
        code=snippet.code,
        explanation=snippet.explanation
    )

    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)

    return {
        "message": "Snippet created successfully",
        "snippet_id": new_snippet.id
    }


@app.get("/snippets", response_model=list[SnippetResponse])
def get_snippets(db: Session = Depends(get_db)):
    return db.query(Snippet).all()
@app.post("/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash the password
    hashed_pwd = hash_password(user.password)

    # Create user
    new_user = User(
        email=user.email,
        hashed_password=hashed_pwd
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
@app.post("/auth/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not db_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "user_id": db_user.id,
        "email": db_user.email
    }
