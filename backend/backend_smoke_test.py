#!/usr/bin/env python3

import base64
import json
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path


BASE_URL = "http://127.0.0.1:8000"
DB_PATH = Path(__file__).with_name("unveilmi.db")


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii")


def make_test_veilmi_message(text: str) -> str:
    """
    Build a structurally valid VEILMI1 envelope for backend testing.

    This is not real encryption. It creates a message with the same
    envelope structure and byte lengths expected by the backend validator.
    """
    envelope = {
        "v": 1,
        "k": "PBKDF2-SHA256",
        "i": 100000,
        "s": base64url_encode(bytes(range(16))),
        "n": base64url_encode(bytes(range(12))),
        "c": base64url_encode(text.encode("utf-8")),
        "m": base64url_encode(bytes(range(16))),
    }

    payload = json.dumps(
        envelope,
        separators=(",", ":"),
    ).encode("utf-8")

    return "VEILMI1:" + base64url_encode(payload)


def request_json(method: str, path: str, payload=None):
    url = BASE_URL + path
    data = None
    headers = {}

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")

        try:
            parsed = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed = body

        return exc.code, parsed


def passed(message: str):
    print(f"[PASS] {message}")


def fail(message: str):
    print(f"[FAIL] {message}")
    cleanup_test_rows()
    sys.exit(1)


def cleanup_test_rows():
    if not DB_PATH.exists():
        return

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "DELETE FROM posts WHERE article_name LIKE 'backend-smoke-%'"
        )
        conn.commit()


def main():
    if not DB_PATH.exists():
        fail(f"Database not found: {DB_PATH}")

    suffix = uuid.uuid4().hex[:8]

    existing_name = f"backend-smoke-existing-{suffix}"
    available_name = f"backend-smoke-available-{suffix}"
    post_name = f"backend-smoke-post-{suffix}"
    invalid_name = f"backend-smoke-invalid-{suffix}"
    expired_name = f"backend-smoke-expired-{suffix}"

    existing_ciphertext = make_test_veilmi_message("existing smoke test")
    post_ciphertext = make_test_veilmi_message("post smoke test")
    expired_ciphertext = make_test_veilmi_message("expired smoke test")

    cleanup_test_rows()

    print("UnVeilmi Backend Smoke Test")
    print("=" * 30)

    # 1. Health check
    try:
        status, body = request_json("GET", "/health")
    except urllib.error.URLError as exc:
        fail(f"Could not connect to backend: {exc}")

    if status != 200 or body != {"status": "ok"}:
        fail(f"/health returned {status}: {body}")

    passed("1. Backend health check")

    # Create one valid temporary post for Tests 2 and 3.
    status, body = request_json(
        "POST",
        "/posts",
        {
            "article_name": existing_name,
            "ciphertext": existing_ciphertext,
            "storage_hours": 1,
            "price": 1,
        },
    )

    if status != 201:
        fail(f"Could not create temporary test post: {status} {body}")

    # 2. Article Name availability
    query = urllib.parse.urlencode({"article_name": existing_name})
    status, body = request_json("GET", f"/posts/check-name?{query}")

    if status != 200 or body.get("available") is not False:
        fail(f"Existing Article Name check failed: {status} {body}")

    query = urllib.parse.urlencode({"article_name": available_name})
    status, body = request_json("GET", f"/posts/check-name?{query}")

    if status != 200 or body.get("available") is not True:
        fail(f"Available Article Name check failed: {status} {body}")

    passed("2. Article Name availability checks")

    # 3. Retrieve an existing post
    encoded_name = urllib.parse.quote(existing_name, safe="")
    status, body = request_json("GET", f"/posts/{encoded_name}")

    if status != 200:
        fail(f"GET existing post failed: {status} {body}")

    if body.get("ciphertext") != existing_ciphertext:
        fail(f"GET returned unexpected ciphertext: {body}")

    passed("3. Retrieve an existing post")

    # 4. Create a valid Veilmi post
    status, body = request_json(
        "POST",
        "/posts",
        {
            "article_name": post_name,
            "ciphertext": post_ciphertext,
            "storage_hours": 1,
            "price": 1,
        },
    )

    if status != 201:
        fail(f"POST failed: {status} {body}")

    required_fields = {
        "id",
        "article_name",
        "ciphertext_size",
        "created_at",
        "expires_at",
        "storage_hours",
        "price",
    }

    if not required_fields.issubset(body):
        fail(f"POST response is missing generated fields: {body}")

    if not body.get("ciphertext_size"):
        fail(f"ciphertext_size was not generated: {body}")

    if not body.get("created_at") or not body.get("expires_at"):
        fail(f"Timestamps were not generated: {body}")

    passed("4. Create a valid Veilmi post")

    # 5. Reject malformed Veilmi ciphertext
    status, body = request_json(
        "POST",
        "/posts",
        {
            "article_name": invalid_name,
            "ciphertext": "VEILMI1:not-a-real-envelope",
            "storage_hours": 1,
            "price": 1,
        },
    )

    if status != 422:
        fail(
            "Malformed Veilmi ciphertext should return 422, "
            f"got {status}: {body}"
        )

    passed("5. Reject malformed Veilmi ciphertext")

    # 6. Expired post cleanup
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
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
                expired_name,
                expired_ciphertext,
                1,
                1,
            ),
        )

        conn.execute(
            """
            UPDATE posts
            SET expires_at = '2000-01-01T00:00:00Z'
            WHERE article_name = ?
            """,
            (expired_name,),
        )

        conn.commit()

    encoded_name = urllib.parse.quote(expired_name, safe="")
    status, body = request_json("GET", f"/posts/{encoded_name}")

    if status != 404:
        fail(f"Expired post should return 404, got {status}: {body}")

    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT 1 FROM posts WHERE article_name = ?",
            (expired_name,),
        ).fetchone()

    if row is not None:
        fail("Expired post still exists in the database after GET cleanup")

    passed("6. Expired post cleanup")

    cleanup_test_rows()

    print("=" * 30)
    print("All 6 backend checks passed.")
    print("UnVeilmi Backend v1 is working correctly.")


if __name__ == "__main__":
    main()
