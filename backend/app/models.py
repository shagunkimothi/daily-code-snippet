from sqlalchemy import Column, Integer, String, Text, Boolean
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)

    hashed_password = Column(String(255), nullable=True)
    google_id = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True)


class Snippet(Base):
    __tablename__ = "snippets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    explanation = Column(Text)
