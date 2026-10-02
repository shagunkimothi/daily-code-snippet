from __future__ import annotations

from threading import Lock
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer


MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIMENSION = 384

_model: SentenceTransformer | None = None
_model_lock = Lock()


def get_embedding_model() -> SentenceTransformer:
    """Return the process-wide model, loading it once on first use."""
    global _model

    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Encode texts as normalized BGE embeddings in input order."""
    if not texts:
        return []
    if any(not isinstance(text, str) for text in texts):
        raise TypeError("All texts to embed must be strings")

    embeddings = get_embedding_model().encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    if len(embeddings) != len(texts):
        raise RuntimeError("Embedding model returned an unexpected batch size")

    results = [embedding.tolist() for embedding in embeddings]
    if any(len(embedding) != EMBEDDING_DIMENSION for embedding in results):
        raise RuntimeError(
            f"Embedding model returned vectors that are not {EMBEDDING_DIMENSION}-dimensional"
        )
    return results


def embed_text(text: str) -> list[float]:
    """Encode one text as a normalized 384-dimensional BGE embedding."""
    return embed_texts([text])[0]
