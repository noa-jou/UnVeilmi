from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from veilmi_validator import (
    VeilmiValidationError,
    validate_veilmi_message,
)


app = FastAPI(title="UnVeilmi API")

DB_PATH = Path(__file__).with_name("unveilmi.db")


class PostCreate(BaseModel):
    article_name: str = Field(min_length=1, max_length=50)
    ciphertext: str = Field(min_length=1)
    storage_hours: int = Field(gt=0)
    price: int = Field(ge=0)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def cleanup_expired_posts() -> None:
    """Delete posts that have already passed expires_at."""
    with get_connection() as conn:
        conn.execute(
            """
            DELETE FROM posts
            WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            """
        )
        conn.commit()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/posts/check-name")
def check_article_name(
    article_name: str = Query(min_length=1, max_length=50),
):
    """
    Check whether an Article Name is currently available.

    Expired posts are cleaned up before the check.
    """
    cleanup_expired_posts()

    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT 1
            FROM posts
            WHERE article_name = ?
            LIMIT 1
            """,
            (article_name,),
        ).fetchone()

    return {
        "article_name": article_name,
        "available": row is None,
    }


@app.get("/posts/{article_name}")
def get_post(article_name: str):
    """
    Retrieve one active post by Article Name.

    Expired posts are cleaned up before searching.
    """
    if not 1 <= len(article_name) <= 50:
        raise HTTPException(
            status_code=422,
            detail="Article Name must contain between 1 and 50 characters.",
        )

    cleanup_expired_posts()

    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT
                article_name,
                ciphertext,
                ciphertext_size,
                created_at,
                expires_at,
                storage_hours,
                price
            FROM posts
            WHERE article_name = ?
            LIMIT 1
            """,
            (article_name,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Post not found or expired.")

    return dict(row)


@app.post("/posts", status_code=201)
def create_post(post: PostCreate):
    """
    Create a new temporary ciphertext post.

    Before storage, the ciphertext must pass strict Veilmi
    message-envelope validation.

    The database trigger generates:
    - ciphertext_size
    - created_at
    - expires_at

    The UNIQUE constraint on article_name remains the final protection
    against duplicate active Article Names.
    """
    try:
        validate_veilmi_message(post.ciphertext)
    except VeilmiValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid Veilmi ciphertext: {exc}",
        ) from exc

    try:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO posts (
                    article_name,
                    ciphertext,
                    storage_hours,
                    price
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    post.article_name,
                    post.ciphertext,
                    post.storage_hours,
                    post.price,
                ),
            )

            post_id = cursor.lastrowid
            conn.commit()

            row = conn.execute(
                """
                SELECT
                    id,
                    article_name,
                    ciphertext_size,
                    created_at,
                    expires_at,
                    storage_hours,
                    price
                FROM posts
                WHERE id = ?
                """,
                (post_id,),
            ).fetchone()

    except sqlite3.IntegrityError as exc:
        if "UNIQUE constraint failed: posts.article_name" in str(exc):
            raise HTTPException(
                status_code=409,
                detail="This Article Name is already in use.",
            ) from exc

        raise HTTPException(
            status_code=400,
            detail="The post could not be created.",
        ) from exc

    return dict(row)
