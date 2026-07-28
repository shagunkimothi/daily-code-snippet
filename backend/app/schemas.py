from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ==========================================================
# TAG SCHEMAS
# ==========================================================

class TagResponse(BaseModel):
    id:   int
    name: str

    class Config:
        from_attributes = True


# ==========================================================
# SNIPPET SCHEMAS
# ==========================================================

class SnippetCreate(BaseModel):
    title:       str
    language:    str
    code:        str
    explanation: str | None = None
    is_public:   bool = True
    difficulty:  str  = "beginner"   # beginner | intermediate | advanced
    category:    str  = "snippet"    # algorithm | utility | pattern | etc
    tags:        list[str] = []      # list of tag name strings


class SnippetResponse(BaseModel):
    id:          int
    title:       str
    language:    str
    code:        str
    explanation: str | None
    is_public:   bool
    difficulty:  str | None = "beginner"
    category:    str | None = "snippet"
    created_at:  datetime | None = None
    tags:        list[TagResponse] = []
    author:               str = "DailyCode Team"
    reading_time_minutes: int = 1

    class Config:
        from_attributes = True


class DailySnippetResponse(SnippetResponse):
    """Superset of SnippetResponse returned only by /snippets/daily — adds
    the UTC rotation metadata the frontend needs for the "today's pick,
    next one tomorrow" display without guessing timezones client-side."""
    rotation_day:     str       # UTC date this pick is pinned to, "YYYY-MM-DD"
    next_rotation_at: datetime  # UTC instant the next day's snippet takes over


# ==========================================================
# SEARCH / FILTER QUERY PARAMS (used as response wrapper)
# ==========================================================

class SnippetSearchResponse(BaseModel):
    snippets: list[SnippetResponse]
    total:    int
    page:     int
    per_page: int


# ==========================================================
# HEATMAP
# ==========================================================

class HeatmapEntry(BaseModel):
    date:  str   # "YYYY-MM-DD"
    count: int


class HeatmapResponse(BaseModel):
    entries: list[HeatmapEntry]
    longest_streak:  int
    current_streak:  int
    total_days_active: int


# ==========================================================
# USER SCHEMAS
# ==========================================================

class UserCreate(BaseModel):
    email:    str
    password: str


class UserLogin(BaseModel):
    email:    str
    password: str


class UserResponse(BaseModel):
    id:        int
    email:     str
    is_active: bool

    class Config:
        from_attributes = True