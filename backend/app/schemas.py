from pydantic import BaseModel


class SnippetCreate(BaseModel):
    title: str
    language: str
    code: str
    explanation: str | None = None
    is_public: bool = True


class SnippetResponse(BaseModel):
    id: int
    title: str
    language: str
    code: str
    explanation: str | None
    is_public: bool

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
