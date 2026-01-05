from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

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
