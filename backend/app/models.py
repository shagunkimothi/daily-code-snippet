from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Table, Index, func
from sqlalchemy.orm import relationship, backref
from pgvector.sqlalchemy import Vector
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

# User <-> Topic (many-to-many) — the onboarding "what would you like to
# learn" multi-select. Deliberately a separate taxonomy from `Tag` (freeform,
# per-snippet labels like "hashmap") — Topic is a small, curated, fixed list
# ("React", "DSA", ...) seeded once, closer in spirit to CATEGORIES below.
user_topics = Table(
    "user_topics",
    Base.metadata,
    Column("user_id",  Integer, ForeignKey("users.id",  ondelete="CASCADE"), primary_key=True),
    Column("topic_id", Integer, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
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

    # Added for the learning-platform features: signup-date analytics,
    # once-only welcome email, and gating the post-signup onboarding wizard.
    created_at            = Column(DateTime, default=datetime.utcnow)
    welcome_email_sent_at = Column(DateTime, nullable=True)
    onboarding_completed  = Column(Boolean, default=False)

    snippets = relationship("Snippet", back_populates="owner")
    topics   = relationship("Topic", secondary=user_topics, backref="users")

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
    embedding_chunks = relationship(
        "SnippetEmbedding",
        back_populates="snippet",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Composite index backing the daily rotation engine's OFFSET-based pick
    # (WHERE is_public ORDER BY id OFFSET n) — keeps that query an index scan
    # instead of a full table scan as the snippets table grows. Declared here
    # for fresh databases (create_all picks it up); existing databases get it
    # via the idempotent CREATE INDEX IF NOT EXISTS in connect_with_retry().
    __table_args__ = (
        Index("ix_snippets_public_id", "is_public", "id"),
    )

    @property
    def author(self):
        """Display name for the snippet's creator. System-seeded snippets
        have no owner; user-submitted ones fall back to the email's local
        part since there's no dedicated display-name field yet."""
        if not self.owner:
            return "DailyCode Team"
        return self.owner.email.split("@")[0]

    @property
    def reading_time_minutes(self):
        """Rough reading time from code + explanation word count, at a
        deliberately slow ~130 wpm to account for reading code carefully
        rather than skimming prose. Floored at 1 so nothing shows "0 min"."""
        words = len((self.code or "").split()) + len((self.explanation or "").split())
        return max(1, round(words / 130))


class SnippetEmbedding(Base):
    __tablename__ = "snippet_embeddings"

    id = Column(Integer, primary_key=True)
    snippet_id = Column(
        Integer,
        ForeignKey("snippets.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding_model = Column(String(255), nullable=False)
    embedding = Column(Vector(384), nullable=False)
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )

    snippet = relationship("Snippet", back_populates="embedding_chunks")

    __table_args__ = (
        Index(
            "ix_snippet_embeddings_embedding_cosine",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index(
            "uq_snippet_embeddings_snippet_chunk",
            "snippet_id",
            "chunk_index",
            unique=True,
        ),
    )


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
# DAILY SNIPPET — rotation pin cache
# ==========================================================
# One row per UTC calendar day ("YYYY-MM-DD"), pinning whichever snippet the
# rotation algorithm picked for that day. The first request of a new UTC day
# computes the pick and writes it here; every request after that (from any
# user, any backend instance) is a single indexed lookup on `day` instead of
# recomputing the rotation — see get_daily_snippet() in main.py.

class DailySnippet(Base):
    __tablename__ = "daily_snippets"

    id         = Column(Integer, primary_key=True, index=True)
    day        = Column(String(20), unique=True, index=True)
    snippet_id = Column(Integer, ForeignKey("snippets.id", ondelete="SET NULL"), nullable=True)

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

# ==========================================================
# TOPIC — curated learning-interest taxonomy (onboarding)
# ==========================================================

class Topic(Base):
    __tablename__ = "topics"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(50), unique=True, nullable=False, index=True)

# ==========================================================
# REMINDER SETTINGS — one row per user, opt-in email cadence
# ==========================================================

class ReminderSettings(Base):
    __tablename__ = "reminder_settings"

    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # none | daily_morning | daily_afternoon | daily_evening | weekly_summary
    frequency  = Column(String(20), default="none", nullable=False)
    timezone   = Column(String(50), default="UTC", nullable=False)  # IANA name, e.g. "Asia/Kolkata"
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref=backref("reminder_settings", uselist=False))