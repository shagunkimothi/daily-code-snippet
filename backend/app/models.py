from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    snippets = relationship("Snippet", back_populates="owner")


class Snippet(Base):
    __tablename__ = "snippets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    explanation = Column(Text)
    is_public = Column(Boolean, default=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="snippets")
from sqlalchemy import DateTime
from datetime import datetime


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    snippet_id = Column(Integer, ForeignKey("snippets.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="favorites")
    snippet = relationship("Snippet", backref="favorited_by")

from datetime import date

class DailySnippet(Base):
    __tablename__ = "daily_snippets"

    id = Column(Integer, primary_key=True, index=True)
    day = Column(String, unique=True, index=True)
    snippet_id = Column(Integer, ForeignKey("snippets.id"))

    snippet = relationship("Snippet")