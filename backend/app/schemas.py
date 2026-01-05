from pydantic import BaseModel


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

