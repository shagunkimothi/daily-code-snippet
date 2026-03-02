from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from .database import Base

# ==========================================================
# ASSOCIATION TABLE — Snippet <-> Tag (many-to-many)
# ==========================================================

snippet_tags = Table(
    "snippet_tags",
    Base.metadata,
    Column("snippet_id", Integer, ForeignKey("snippets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id",     Integer, ForeignKey("tags.id",     ondelete="CASCADE"), primary_key=True),
)

# ==========================================================
# USER
# ==========================================================

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    google_id       = Column(String(255), nullable=True)
    is_active       = Column(Boolean, default=True)

    snippets = relationship("Snippet", back_populates="owner")

# ==========================================================
# TAG
# ==========================================================

class Tag(Base):
    __tablename__ = "tags"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

# ==========================================================
# SNIPPET
# ==========================================================

DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"]
CATEGORIES        = ["algorithm", "data-structure", "utility", "pattern", "snippet", "other"]

class Snippet(Base):
    __tablename__ = "snippets"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(255), nullable=False)
    language    = Column(String(50),  nullable=False)
    code        = Column(Text,        nullable=False)
    explanation = Column(Text)
    is_public   = Column(Boolean, default=True)
    difficulty  = Column(String(20), default="beginner")
    category    = Column(String(50), default="snippet")
    created_at  = Column(DateTime,   default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner    = relationship("User", back_populates="snippets")
    tags     = relationship("Tag", secondary=snippet_tags, backref="snippets")

# ==========================================================
# FAVORITE
# ==========================================================

class Favorite(Base):
    __tablename__ = "favorites"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"),    nullable=False)
    snippet_id = Column(Integer, ForeignKey("snippets.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user    = relationship("User",    backref="favorites")
    snippet = relationship("Snippet", backref="favorited_by")

# ==========================================================
# DAILY SNIPPET
# ==========================================================

class DailySnippet(Base):
    __tablename__ = "daily_snippets"

    id         = Column(Integer, primary_key=True, index=True)
    day        = Column(String(20), unique=True, index=True)
    snippet_id = Column(Integer, ForeignKey("snippets.id"))

    snippet = relationship("Snippet")

# ==========================================================
# ACTIVITY
# ==========================================================

class Activity(Base):
    __tablename__ = "activities"

    id         = Column(Integer, primary_key=True, index=True)
    action     = Column(String(100), nullable=False)
    snippet_id = Column(Integer, nullable=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    timestamp  = Column(DateTime, default=datetime.utcnow)