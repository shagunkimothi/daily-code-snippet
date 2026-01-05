from pydantic import BaseModel

# =========================
# SNIPPET SCHEMAS
# =========================
class SnippetCreate(BaseModel):
    title: str
    language: str
    code: str
    explanation: str | None = None


class SnippetResponse(BaseModel):
    id: int
    title: str
    language: str
    code: str
    explanation: str | None = None

    class Config:
        from_attributes = True


# =========================
# USER SCHEMAS (AUTH)
# =========================
class UserCreate(BaseModel):
    email: str
    password: str
class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool

    class Config:
        from_attributes = True
