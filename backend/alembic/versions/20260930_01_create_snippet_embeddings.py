"""Create pgvector-backed snippet embedding storage.

Revision ID: 20260930_01
Revises:
Create Date: 2026-09-30
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "20260930_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "snippet_embeddings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("snippet_id", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("embedding_model", sa.String(length=255), nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["snippet_id"],
            ["snippets.id"],
            name="fk_snippet_embeddings_snippet_id_snippets",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_snippet_embeddings"),
    )
    op.create_index(
        "uq_snippet_embeddings_snippet_chunk",
        "snippet_embeddings",
        ["snippet_id", "chunk_index"],
        unique=True,
    )
    op.create_index(
        "ix_snippet_embeddings_embedding_cosine",
        "snippet_embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade():
    op.drop_table("snippet_embeddings")
