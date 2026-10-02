"""Manual, privacy-aware semantic retrieval for DailyCode snippets."""

from dataclasses import dataclass

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.embedding_service import MODEL_NAME, embed_text
from app.models import Snippet, SnippetEmbedding

MINIMUM_SIMILARITY = 0.35

@dataclass(frozen=True)
class SemanticSnippetMatch:
    snippet: Snippet
    similarity_score: float


def build_snippet_embedding_text(snippet: Snippet) -> str:
    """Serialize snippet attributes into standardized text for embedding."""
    return (
        f"Title: {snippet.title or ''}\n"
        f"Language: {snippet.language or ''}\n"
        f"Category: {snippet.category or ''}\n"
        f"Difficulty: {snippet.difficulty or ''}\n"
        f"Explanation: {snippet.explanation or ''}\n"
        f"Code:\n{snippet.code or ''}"
    )


def build_rag_context(matches: list[SemanticSnippetMatch]) -> list[dict[str, str | int]]:
    """Serialize only retrieved, authorized snippets for the generation model."""
    return [
        {
            "id": match.snippet.id,
            "title": match.snippet.title,
            "language": match.snippet.language,
            "category": match.snippet.category or "",
            "difficulty": match.snippet.difficulty or "",
            "explanation": match.snippet.explanation or "",
            "code": match.snippet.code,
        }
        for match in matches
    ]


def retrieve_semantic_snippets(
    query_or_db: Session | str,
    query_or_user: str | int | None = None,
    current_user_id: int | None = None,
    top_k: int = 5,
    db: Session | None = None,
) -> list[SemanticSnippetMatch]:
    """Return the nearest snippets the caller is allowed to see.

    Supports both (db, query, current_user_id, top_k) and
    (query, current_user_id, top_k, db=db) calling conventions.

    The visibility predicate is intentionally applied in SQL before the
    distance ordering and LIMIT. This keeps private snippets owned by other
    users out of both retrieval results and any downstream Gemini context.
    """
    if isinstance(query_or_db, Session):
        session = query_or_db
        query_text = str(query_or_user or "")
        user_id = current_user_id
        limit = top_k
    else:
        session = db
        query_text = str(query_or_db or "")
        user_id = int(query_or_user) if isinstance(query_or_user, int) else current_user_id
        limit = top_k

    if session is None:
        raise ValueError("Database session must be provided")

    normalized_query = query_text.strip()
    if not normalized_query:
        return []

    query_embedding = embed_text(normalized_query)
    distance = SnippetEmbedding.embedding.cosine_distance(query_embedding)
    visibility_filter = (
        or_(Snippet.is_public.is_(True), Snippet.owner_id == user_id)
        if user_id is not None
        else Snippet.is_public.is_(True)
    )

    rows = (
        session.query(Snippet, (1 - distance).label("similarity_score"))
        .join(SnippetEmbedding, SnippetEmbedding.snippet_id == Snippet.id)
        .filter(
            visibility_filter,
            SnippetEmbedding.embedding_model == MODEL_NAME,
            SnippetEmbedding.chunk_index == 0,
            (1 - distance) >= MINIMUM_SIMILARITY,
        )
        .order_by(distance.asc())
        .limit(limit)
        .all()
    )
    return [
        SemanticSnippetMatch(snippet=snippet, similarity_score=float(similarity))
        for snippet, similarity in rows
    ]
