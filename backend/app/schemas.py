from pydantic import BaseModel, Field
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


class SemanticSnippetResponse(SnippetResponse):
    """A permitted snippet returned by pgvector semantic retrieval."""
    similarity_score: float


class SemanticSearchResponse(BaseModel):
    query: str
    snippets: list[SemanticSnippetResponse]


class RagGenerationRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    top_k: int = Field(5, ge=1, le=20)


class RagGenerationResponse(BaseModel):
    answer: str
    grounded: bool
    snippets: list[SemanticSnippetResponse]


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
# ANALYTICS — separate, richer endpoint; does not replace
# /dashboard/me or /heatmap/me, which the existing Dashboard keeps using.
# ==========================================================

class WeeklyActivityPoint(BaseModel):
    week_start: str  # "YYYY-MM-DD", Monday of that week
    count: int


class MonthlyActivityPoint(BaseModel):
    month: str  # "YYYY-MM"
    count: int


class CategoryCount(BaseModel):
    category: str
    count:    int


class AnalyticsResponse(BaseModel):
    current_streak:                int
    longest_streak:                int
    total_active_days:              int
    snippets_completed:             int
    favorites_count:                int
    weekly_activity:                list[WeeklyActivityPoint]
    monthly_activity:               list[MonthlyActivityPoint]
    category_distribution:          list[CategoryCount]
    favorite_category:              str | None = None
    reading_consistency_pct:        float
    average_learning_time_minutes:  float
    preferred_topics:               list[str]
    learning_trend_pct:             float  # vs. the previous 2-week period; positive = improving


# ==========================================================
# RECOMMENDATIONS — v1 rule-based, computed on request (see main.py for
# the scoring + the plan's note on exactly where a `recommendations` table
# slots in later once generation moves to an LLM call).
# ==========================================================

class RecommendedSnippet(BaseModel):
    id:         int
    title:      str
    language:   str
    category:   str
    difficulty: str
    reason:     str  # short, human-readable "why this" — e.g. "Matches your interest in React"


class RecommendationsResponse(BaseModel):
    next_snippet:     RecommendedSnippet | None = None
    suggested_topics: list[str]  # topics selected at onboarding/Settings but not yet explored
    related_snippets: list[RecommendedSnippet]


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


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password:      str


# ==========================================================
# TOPICS (onboarding "what would you like to learn")
# ==========================================================

class TopicResponse(BaseModel):
    id:   int
    name: str
    slug: str

    class Config:
        from_attributes = True


class TopicsUpdate(BaseModel):
    topic_ids: list[int]


# ==========================================================
# REMINDER SETTINGS
# ==========================================================

REMINDER_FREQUENCIES = ["none", "daily_morning", "daily_afternoon", "daily_evening", "weekly_summary"]


class ReminderSettingsResponse(BaseModel):
    frequency: str
    timezone:  str


class ReminderSettingsUpdate(BaseModel):
    frequency: str
    timezone:  str = "UTC"


# ==========================================================
# USER "ME" (profile + onboarding + preferences, one call)
# ==========================================================

class UserMeResponse(BaseModel):
    id:                   int
    email:                str
    created_at:           datetime | None = None
    onboarding_completed: bool = False
    has_password:         bool = True  # False for Google-only accounts — Settings uses this to hide the change-password form rather than let it always fail with a confusing error
    topics:               list[TopicResponse] = []
    reminder_settings:    ReminderSettingsResponse

    class Config:
        from_attributes = True
