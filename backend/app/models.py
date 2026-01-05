from sqlalchemy import Column, Integer, String, Text
from .database import Base

class Snippet(Base):
    __tablename__ = "snippets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    explanation = Column(Text)
