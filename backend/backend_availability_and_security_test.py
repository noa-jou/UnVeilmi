#!/usr/bin/env python3
"""
UnVeilmi Backend Availability and Security Test

Purpose
-------
This is a comprehensive integration/security regression test for the local
UnVeilmi FastAPI backend and SQLite database.

It DOES NOT require demo_seed.sql.

The test suite:
- creates its own uniquely named test records;
- exercises the public HTTP API;
- verifies important database side effects;
- tests pricing, validation, duplicate protection, expiry cleanup, CORS,
  SQL-injection-style Article Names, and strict Veilmi envelope validation;
- removes only its own test records when finished.

Important security scope
------------------------
This script tests backend/API/database behavior. It is NOT a cryptographic
audit. The synthetic VEILMI1 messages created here are structurally valid
test envelopes, not real encrypted user messages.

Run from the backend directory while the API is running, for example:

    source .venv/bin/activate
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload

Then, in another terminal:

    python dackend_avaliable_and_security_test.py

Exit codes:
    0 = all tests passed
    1 = one or more tests failed
    2 = test environment/backend unavailable
"""

from __future__ import annotations

import base64
import json
import math
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = Path(__file__).with_name("unveilmi.db")

BYTES_PER_KB = 1024
HOURS_PER_DAY = 24
USD_PER_KB_DAY = 1

MIN_STORAGE_HOURS = 1
MAX_STORAGE_HOURS = 8760
MAX_ARTICLE_NAME_LENGTH = 50

ALLOWED_ORIGIN = "http://127.0.0.1:5500"
DISALLOWED_ORIGIN = "https://evil.example"

SUITE_ID = uuid.uuid4().hex[:10]
TEST_PREFIX = f"backend-security-{SUITE_ID}"


# ---------------------------------------------------------------------------
# Small test framework
# ---------------------------------------------------------------------------

class TestFailure(AssertionError):
    """Raised when one test expectation is not met."""


class TestRunner:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def run(
        self,
        name: str,
        test_function: Callable[[], None],
    ) -> None:
        try:
            test_function()
        except TestFailure as exc:
            self.failed += 1
            print(f"[FAIL] {name}")
            print(f"       {exc}")
        except Exception as exc:  # noqa: BLE001 - test runner must continue.
            self.failed += 1
            print(f"[ERROR] {name}")
            print(f"        {type(exc).__name__}: {exc}")
        else:
            self.passed += 1
            print(f"[PASS] {name}")

    def summary(self) -> int:
        total = self.passed + self.failed

        print()
        print("=" * 72)
        print("UnVeilmi Backend Availability and Security Test Summary")
        print("=" * 72)
        print(f"Total:  {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")

        if self.failed == 0:
            print()
            print("All checks passed.")
            print("The tested backend/API/database behaviors are working correctly.")
            return 0

        print()
        print("One or more checks failed.")
        print("Review the failed test names and messages above.")
        return 1


def require(
    condition: bool,
    message: str,
) -> None:
    if not condition:
        raise TestFailure(message)


def require_equal(
    actual: Any,
    expected: Any,
    message: str,
) -> None:
    if actual != expected:
        raise TestFailure(
            f"{message} Expected {expected!r}, got {actual!r}."
        )


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

_NO_PAYLOAD = object()


def request_json(
    method: str,
    path: str,
    payload: Any = _NO_PAYLOAD,
    extra_headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], Any]:
    """
    Send one request and return:
        (status_code, response_headers, parsed_body)

    HTTP error responses are returned normally so tests can assert 4xx/5xx.
    Connection failures are allowed to propagate.
    """

    url = BASE_URL + path
    headers: dict[str, str] = {}

    if extra_headers:
        headers.update(extra_headers)

    data = None

    if payload is not _NO_PAYLOAD:
        data = json.dumps(payload).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=5,
        ) as response:
            raw_body = response.read().decode("utf-8")
            response_headers = {
                key.lower(): value
                for key, value in response.headers.items()
            }

            if not raw_body:
                body: Any = None
            else:
                try:
                    body = json.loads(raw_body)
                except json.JSONDecodeError:
                    body = raw_body

            return response.status, response_headers, body

    except urllib.error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8")
        response_headers = {
            key.lower(): value
            for key, value in exc.headers.items()
        }

        if not raw_body:
            body = None
        else:
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError:
                body = raw_body

        return exc.code, response_headers, body


def request_raw(
    method: str,
    path: str,
    raw_body: bytes | None = None,
    extra_headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], Any]:
    """Send a request without JSON-encoding the request body."""

    url = BASE_URL + path
    headers = dict(extra_headers or {})

    request = urllib.request.Request(
        url,
        data=raw_body,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=5,
        ) as response:
            raw_response = response.read().decode("utf-8")
            response_headers = {
                key.lower(): value
                for key, value in response.headers.items()
            }

            try:
                body = json.loads(raw_response) if raw_response else None
            except json.JSONDecodeError:
                body = raw_response

            return response.status, response_headers, body

    except urllib.error.HTTPError as exc:
        raw_response = exc.read().decode("utf-8")
        response_headers = {
            key.lower(): value
            for key, value in exc.headers.items()
        }

        try:
            body = json.loads(raw_response) if raw_response else None
        except json.JSONDecodeError:
            body = raw_response

        return exc.code, response_headers, body


# ---------------------------------------------------------------------------
# VEILMI1 test-message helpers
# ---------------------------------------------------------------------------

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii")


def make_test_veilmi_message(
    text: str = "security test",
    *,
    version: int = 1,
    kdf: str = "PBKDF2-SHA256",
    iterations: int = 100000,
    salt_length: int = 16,
    nonce_length: int = 12,
    mac_length: int = 16,
    force_empty_ciphertext: bool = False,
) -> str:
    """
    Build a structurally valid or intentionally malformed VEILMI1 envelope.

    This function does NOT perform real encryption.
    """

    ciphertext_bytes = (
        b""
        if force_empty_ciphertext
        else text.encode("utf-8")
    )

    envelope = {
        "v": version,
        "k": kdf,
        "i": iterations,
        "s": base64url_encode(bytes(range(salt_length))),
        "n": base64url_encode(bytes(range(nonce_length))),
        "c": base64url_encode(ciphertext_bytes),
        "m": base64url_encode(bytes(range(mac_length))),
    }

    payload = json.dumps(
        envelope,
        separators=(",", ":"),
    ).encode("utf-8")

    return "VEILMI1:" + base64url_encode(payload)


# ---------------------------------------------------------------------------
# Pricing helpers
# ---------------------------------------------------------------------------

def calculate_expected_price(
    ciphertext: str,
    storage_hours: int,
) -> int:
    """
    Mirror the documented UnVeilmi pricing contract:

    Free:
        ciphertext <= 1024 bytes AND storage <= 24 hours

    Otherwise:
        ceil(
            (ciphertext_bytes / 1024)
            * (storage_hours / 24)
            * USD 1
        )
    """

    ciphertext_size = len(
        ciphertext.encode("utf-8")
    )

    if (
        ciphertext_size <= BYTES_PER_KB
        and storage_hours <= HOURS_PER_DAY
    ):
        return 0

    raw_price = (
        (ciphertext_size / BYTES_PER_KB)
        * (storage_hours / HOURS_PER_DAY)
        * USD_PER_KB_DAY
    )

    return math.ceil(raw_price)


def post_payload(
    article_name: str,
    ciphertext: str,
    storage_hours: int,
    *,
    price: int | None = None,
) -> dict[str, Any]:
    if price is None:
        price = calculate_expected_price(
            ciphertext,
            storage_hours,
        )

    return {
        "article_name": article_name,
        "ciphertext": ciphertext,
        "storage_hours": storage_hours,
        "price": price,
    }


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def cleanup_test_rows() -> None:
    """
    Delete only rows created by this test suite.

    Existing demo/user data is never intentionally touched.
    """

    if not DB_PATH.exists():
        return

    with get_connection() as conn:
        conn.execute(
            """
            DELETE FROM posts
            WHERE article_name LIKE ?
            """,
            (f"{TEST_PREFIX}-%",),
        )
        conn.commit()


def get_db_row(
    article_name: str,
) -> sqlite3.Row | None:
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT *
            FROM posts
            WHERE article_name = ?
            LIMIT 1
            """,
            (article_name,),
        ).fetchone()


def row_exists(
    article_name: str,
) -> bool:
    return get_db_row(article_name) is not None


def table_exists(
    table_name: str,
) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
            """,
            (table_name,),
        ).fetchone()

    return row is not None


def insert_expired_test_row(
    article_name: str,
    ciphertext: str | None = None,
) -> None:
    """
    Insert one test row directly, then force it to be expired.

    Direct DB insertion is used only to create an expiry condition that would
    otherwise require waiting in real time.
    """

    if ciphertext is None:
        ciphertext = make_test_veilmi_message(
            "expired security test"
        )

    storage_hours = 2
    price = calculate_expected_price(
        ciphertext,
        storage_hours,
    )

    with get_connection() as conn:
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
                article_name,
                ciphertext,
                storage_hours,
                price,
            ),
        )

        conn.execute(
            """
            UPDATE posts
            SET expires_at = '2000-01-01T00:00:00Z'
            WHERE article_name = ?
            """,
            (article_name,),
        )

        conn.commit()


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

def parse_utc_timestamp(
    value: str,
) -> datetime:
    """
    Parse timestamps in the format used by the SQLite trigger:
        YYYY-MM-DDTHH:MM:SSZ
    """

    return datetime.strptime(
        value,
        "%Y-%m-%dT%H:%M:%SZ",
    ).replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

def preflight_or_exit() -> None:
    if not DB_PATH.exists():
        print(f"[FATAL] Database not found: {DB_PATH}")
        sys.exit(2)

    if not table_exists("posts"):
        print("[FATAL] Required SQLite table 'posts' does not exist.")
        sys.exit(2)

    try:
        status, _, body = request_json(
            "GET",
            "/health",
        )
    except urllib.error.URLError as exc:
        print(
            "[FATAL] Could not connect to the backend at "
            f"{BASE_URL}: {exc}"
        )
        print()
        print(
            "Start the API first, for example:"
        )
        print(
            "uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
        )
        sys.exit(2)

    if (
        status != 200
        or body != {"status": "ok"}
    ):
        print(
            f"[FATAL] /health returned {status}: {body}"
        )
        sys.exit(2)


# ---------------------------------------------------------------------------
# Individual tests
# ---------------------------------------------------------------------------

def test_database_schema() -> None:
    required_columns = {
        "id",
        "article_name",
        "ciphertext",
        "storage_hours",
        "price",
        "ciphertext_size",
        "created_at",
        "expires_at",
    }

    with get_connection() as conn:
        rows = conn.execute(
            "PRAGMA table_info(posts)"
        ).fetchall()

    actual_columns = {
        row["name"]
        for row in rows
    }

    missing = required_columns - actual_columns

    require(
        not missing,
        f"posts table is missing columns: {sorted(missing)}",
    )


def test_health_endpoint() -> None:
    status, _, body = request_json(
        "GET",
        "/health",
    )

    require_equal(
        status,
        200,
        "Health endpoint status mismatch.",
    )

    require_equal(
        body,
        {"status": "ok"},
        "Health endpoint body mismatch.",
    )


def test_allowed_cors_origin() -> None:
    status, headers, _ = request_json(
        "GET",
        "/health",
        extra_headers={
            "Origin": ALLOWED_ORIGIN,
        },
    )

    require_equal(
        status,
        200,
        "Allowed-origin health request failed.",
    )

    require_equal(
        headers.get("access-control-allow-origin"),
        ALLOWED_ORIGIN,
        "Allowed CORS origin was not returned.",
    )


def test_disallowed_cors_origin() -> None:
    status, headers, _ = request_json(
        "GET",
        "/health",
        extra_headers={
            "Origin": DISALLOWED_ORIGIN,
        },
    )

    require_equal(
        status,
        200,
        "Disallowed-origin health request unexpectedly failed.",
    )

    require(
        "access-control-allow-origin" not in headers,
        "Disallowed origin received Access-Control-Allow-Origin.",
    )


def test_cors_preflight() -> None:
    status, headers, _ = request_raw(
        "OPTIONS",
        "/posts",
        extra_headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    require(
        status in {200, 204},
        f"CORS preflight returned unexpected status {status}.",
    )

    require_equal(
        headers.get("access-control-allow-origin"),
        ALLOWED_ORIGIN,
        "CORS preflight did not approve the frontend origin.",
    )


def test_unsupported_delete_method() -> None:
    name = f"{TEST_PREFIX}-no-delete"

    status, _, _ = request_json(
        "DELETE",
        f"/posts/{urllib.parse.quote(name, safe='')}",
    )

    require_equal(
        status,
        405,
        "DELETE should not be exposed for posts.",
    )


def test_name_availability_for_unused_name() -> None:
    name = f"{TEST_PREFIX}-unused"

    query = urllib.parse.urlencode({
        "article_name": name,
    })

    status, _, body = request_json(
        "GET",
        f"/posts/check-name?{query}",
    )

    require_equal(
        status,
        200,
        "Unused Article Name check failed.",
    )

    require(
        body.get("available") is True,
        f"Unused name was not reported available: {body}",
    )


def test_empty_name_rejected() -> None:
    status, _, _ = request_json(
        "GET",
        "/posts/check-name?article_name=",
    )

    require_equal(
        status,
        422,
        "Empty Article Name should return 422.",
    )


def test_name_over_50_characters_rejected() -> None:
    name = "x" * 51

    query = urllib.parse.urlencode({
        "article_name": name,
    })

    status, _, _ = request_json(
        "GET",
        f"/posts/check-name?{query}",
    )

    require_equal(
        status,
        422,
        "51-character Article Name should return 422.",
    )


def test_valid_free_tier_post_and_db_trigger() -> None:
    name = f"{TEST_PREFIX}-free-tier"
    ciphertext = make_test_veilmi_message(
        "free tier database trigger test"
    )
    storage_hours = 24

    require(
        len(ciphertext.encode("utf-8")) <= 1024,
        "Test fixture unexpectedly exceeds 1 KB.",
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            storage_hours,
        ),
    )

    require_equal(
        status,
        201,
        f"Valid free-tier POST failed: {body}",
    )

    expected_response_fields = {
        "id",
        "article_name",
        "ciphertext_size",
        "created_at",
        "expires_at",
        "storage_hours",
        "price",
    }

    require(
        expected_response_fields.issubset(body),
        f"POST response is missing fields: {body}",
    )

    require(
        "ciphertext" not in body,
        "POST response unexpectedly echoed the ciphertext.",
    )

    require_equal(
        body.get("article_name"),
        name,
        "POST returned wrong Article Name.",
    )

    require_equal(
        body.get("price"),
        0,
        "Free-tier post should cost USD 0.",
    )

    expected_size = len(
        ciphertext.encode("utf-8")
    )

    require_equal(
        body.get("ciphertext_size"),
        expected_size,
        "POST returned wrong ciphertext_size.",
    )

    db_row = get_db_row(name)

    require(
        db_row is not None,
        "Created post was not found in SQLite.",
    )

    require_equal(
        db_row["ciphertext"],
        ciphertext,
        "SQLite stored a different ciphertext.",
    )

    require_equal(
        db_row["ciphertext_size"],
        expected_size,
        "SQLite trigger generated wrong ciphertext_size.",
    )

    require_equal(
        db_row["price"],
        0,
        "SQLite stored wrong backend price.",
    )

    created_at = parse_utc_timestamp(
        db_row["created_at"]
    )
    expires_at = parse_utc_timestamp(
        db_row["expires_at"]
    )

    expiry_seconds = int(
        (expires_at - created_at).total_seconds()
    )

    require_equal(
        expiry_seconds,
        storage_hours * 3600,
        "expires_at does not match storage_hours.",
    )


def test_existing_name_becomes_unavailable() -> None:
    name = f"{TEST_PREFIX}-existing"
    ciphertext = make_test_veilmi_message(
        "existing name"
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
        ),
    )

    require_equal(
        status,
        201,
        f"Could not create fixture: {body}",
    )

    query = urllib.parse.urlencode({
        "article_name": name,
    })

    status, _, body = request_json(
        "GET",
        f"/posts/check-name?{query}",
    )

    require_equal(
        status,
        200,
        "Existing Article Name check failed.",
    )

    require(
        body.get("available") is False,
        f"Existing name was reported available: {body}",
    )


def test_retrieve_existing_post() -> None:
    name = f"{TEST_PREFIX}-retrieve"
    ciphertext = make_test_veilmi_message(
        "retrieve exact ciphertext"
    )

    create_status, _, create_body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
        ),
    )

    require_equal(
        create_status,
        201,
        f"Could not create retrieval fixture: {create_body}",
    )

    encoded_name = urllib.parse.quote(
        name,
        safe="",
    )

    status, _, body = request_json(
        "GET",
        f"/posts/{encoded_name}",
    )

    require_equal(
        status,
        200,
        f"GET existing post failed: {body}",
    )

    require_equal(
        body.get("article_name"),
        name,
        "GET returned wrong Article Name.",
    )

    require_equal(
        body.get("ciphertext"),
        ciphertext,
        "GET returned wrong ciphertext.",
    )

    require_equal(
        body.get("storage_hours"),
        2,
        "GET returned wrong storage duration.",
    )

    require_equal(
        body.get("price"),
        0,
        "GET returned wrong free-tier price.",
    )

    require(
        "id" not in body,
        "GET response unexpectedly exposed the internal database id.",
    )


def test_duplicate_name_rejected() -> None:
    name = f"{TEST_PREFIX}-duplicate"
    ciphertext = make_test_veilmi_message(
        "duplicate name"
    )

    payload = post_payload(
        name,
        ciphertext,
        2,
    )

    first_status, _, first_body = request_json(
        "POST",
        "/posts",
        payload,
    )

    require_equal(
        first_status,
        201,
        f"Could not create duplicate fixture: {first_body}",
    )

    second_status, _, second_body = request_json(
        "POST",
        "/posts",
        payload,
    )

    require_equal(
        second_status,
        409,
        f"Duplicate Article Name should return 409: {second_body}",
    )


def test_incorrect_price_rejected_without_insert() -> None:
    name = f"{TEST_PREFIX}-wrong-price"
    ciphertext = make_test_veilmi_message(
        "wrong price"
    )

    correct_price = calculate_expected_price(
        ciphertext,
        25,
    )

    wrong_price = correct_price + 1

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            25,
            price=wrong_price,
        ),
    )

    require_equal(
        status,
        422,
        f"Incorrect price should return 422: {body}",
    )

    require(
        not row_exists(name),
        "Incorrect-price request created a database row.",
    )


def test_small_ciphertext_after_24_hours_is_billable() -> None:
    name = f"{TEST_PREFIX}-25-hours"
    ciphertext = make_test_veilmi_message(
        "25-hour pricing"
    )

    expected = calculate_expected_price(
        ciphertext,
        25,
    )

    require(
        expected >= 1,
        "25-hour pricing fixture should not be free.",
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            25,
        ),
    )

    require_equal(
        status,
        201,
        f"25-hour POST failed: {body}",
    )

    require_equal(
        body.get("price"),
        expected,
        "25-hour backend price mismatch.",
    )


def test_large_ciphertext_within_24_hours_is_billable() -> None:
    name = f"{TEST_PREFIX}-large"
    ciphertext = make_test_veilmi_message(
        "A" * 1800
    )

    size = len(
        ciphertext.encode("utf-8")
    )

    require(
        size > 1024,
        f"Large test ciphertext is only {size} bytes.",
    )

    expected = calculate_expected_price(
        ciphertext,
        24,
    )

    require(
        expected >= 1,
        "Large ciphertext should not be free.",
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            24,
        ),
    )

    require_equal(
        status,
        201,
        f"Large ciphertext POST failed: {body}",
    )

    require_equal(
        body.get("price"),
        expected,
        "Large ciphertext price mismatch.",
    )


def test_maximum_storage_duration_accepted() -> None:
    name = f"{TEST_PREFIX}-max-hours"
    ciphertext = make_test_veilmi_message(
        "maximum duration"
    )

    expected = calculate_expected_price(
        ciphertext,
        MAX_STORAGE_HOURS,
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            MAX_STORAGE_HOURS,
        ),
    )

    require_equal(
        status,
        201,
        f"8760-hour POST failed: {body}",
    )

    require_equal(
        body.get("price"),
        expected,
        "Maximum-duration price mismatch.",
    )


def test_one_hour_minimum_contract() -> None:
    """
    Product contract test.

    UnVeilmi's UI/pricing rules define the minimum as 1 hour.
    Therefore the backend should accept storage_hours=1.
    """

    name = f"{TEST_PREFIX}-one-hour"
    ciphertext = make_test_veilmi_message(
        "one hour minimum"
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            MIN_STORAGE_HOURS,
        ),
    )

    require_equal(
        status,
        201,
        (
            "storage_hours=1 should be accepted by the product contract. "
            "If this fails with 422, check whether PostCreate uses "
            "Field(gt=1) instead of Field(ge=1). "
            f"Response: {body}"
        ),
    )


def test_zero_storage_hours_rejected() -> None:
    name = f"{TEST_PREFIX}-zero-hours"
    ciphertext = make_test_veilmi_message(
        "zero hours"
    )

    status, _, _ = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            0,
            price=0,
        ),
    )

    require_equal(
        status,
        422,
        "storage_hours=0 should return 422.",
    )


def test_storage_above_maximum_rejected() -> None:
    name = f"{TEST_PREFIX}-too-many-hours"
    ciphertext = make_test_veilmi_message(
        "too many hours"
    )

    status, _, _ = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            MAX_STORAGE_HOURS + 1,
            price=0,
        ),
    )

    require_equal(
        status,
        422,
        "storage_hours=8761 should return 422.",
    )


def test_negative_price_rejected() -> None:
    name = f"{TEST_PREFIX}-negative-price"
    ciphertext = make_test_veilmi_message(
        "negative price"
    )

    status, _, _ = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
            price=-1,
        ),
    )

    require_equal(
        status,
        422,
        "Negative price should return 422.",
    )


def test_post_name_over_50_characters_rejected() -> None:
    name = "x" * 51
    ciphertext = make_test_veilmi_message(
        "long name"
    )

    status, _, _ = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
        ),
    )

    require_equal(
        status,
        422,
        "POST with 51-character Article Name should return 422.",
    )


def test_missing_required_field_rejected() -> None:
    name = f"{TEST_PREFIX}-missing-field"
    ciphertext = make_test_veilmi_message(
        "missing field"
    )

    payload = {
        "article_name": name,
        "ciphertext": ciphertext,
        "storage_hours": 2,
        # price intentionally missing
    }

    status, _, _ = request_json(
        "POST",
        "/posts",
        payload,
    )

    require_equal(
        status,
        422,
        "POST missing price should return 422.",
    )


def test_malformed_json_rejected() -> None:
    status, _, _ = request_raw(
        "POST",
        "/posts",
        raw_body=b'{"article_name":',
        extra_headers={
            "Content-Type": "application/json",
        },
    )

    require_equal(
        status,
        422,
        "Malformed JSON should return 422.",
    )


def test_sql_injection_style_article_name_is_literal() -> None:
    # Intentionally contains SQL metacharacters.
    suffix = "' OR 1=1 --"
    name = f"{TEST_PREFIX}-{suffix}"

    require(
        len(name) <= MAX_ARTICLE_NAME_LENGTH,
        "SQL-injection test name exceeds Article Name limit.",
    )

    ciphertext = make_test_veilmi_message(
        "sql injection literal-name test"
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
        ),
    )

    require_equal(
        status,
        201,
        f"Literal SQL-style Article Name could not be stored: {body}",
    )

    encoded_name = urllib.parse.quote(
        name,
        safe="",
    )

    status, _, body = request_json(
        "GET",
        f"/posts/{encoded_name}",
    )

    require_equal(
        status,
        200,
        f"Literal SQL-style Article Name could not be retrieved: {body}",
    )

    require_equal(
        body.get("article_name"),
        name,
        "SQL-style Article Name was altered.",
    )

    require(
        table_exists("posts"),
        "posts table disappeared after SQL-style Article Name test.",
    )


def test_unicode_article_name_round_trip() -> None:
    name = f"{TEST_PREFIX}-貓-秘密"
    ciphertext = make_test_veilmi_message(
        "unicode Article Name"
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
        ),
    )

    require_equal(
        status,
        201,
        f"Unicode Article Name POST failed: {body}",
    )

    encoded_name = urllib.parse.quote(
        name,
        safe="",
    )

    status, _, body = request_json(
        "GET",
        f"/posts/{encoded_name}",
    )

    require_equal(
        status,
        200,
        f"Unicode Article Name GET failed: {body}",
    )

    require_equal(
        body.get("article_name"),
        name,
        "Unicode Article Name did not round-trip exactly.",
    )


def test_supported_veilmi_iterations() -> None:
    for iterations in (
        50000,
        100000,
        600000,
    ):
        name = (
            f"{TEST_PREFIX}-iterations-{iterations}"
        )

        ciphertext = make_test_veilmi_message(
            f"supported iterations {iterations}",
            iterations=iterations,
        )

        status, _, body = request_json(
            "POST",
            "/posts",
            post_payload(
                name,
                ciphertext,
                2,
            ),
        )

        require_equal(
            status,
            201,
            (
                f"Supported PBKDF2 iteration count {iterations} "
                f"was rejected: {body}"
            ),
        )


def test_invalid_veilmi_case(
    label: str,
    ciphertext: str,
) -> None:
    name = (
        f"{TEST_PREFIX}-invalid-"
        f"{uuid.uuid4().hex[:6]}"
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            ciphertext,
            2,
            price=0,
        ),
    )

    require_equal(
        status,
        422,
        f"{label} should return 422: {body}",
    )

    require(
        not row_exists(name),
        f"{label} created a database row.",
    )


def test_expired_post_cleanup_on_get() -> None:
    name = f"{TEST_PREFIX}-expired-get"
    insert_expired_test_row(name)

    require(
        row_exists(name),
        "Could not create expired GET fixture.",
    )

    encoded_name = urllib.parse.quote(
        name,
        safe="",
    )

    status, _, _ = request_json(
        "GET",
        f"/posts/{encoded_name}",
    )

    require_equal(
        status,
        404,
        "Expired GET should return 404.",
    )

    require(
        not row_exists(name),
        "Expired row still exists after GET cleanup.",
    )


def test_expired_post_cleanup_on_check_name() -> None:
    name = f"{TEST_PREFIX}-expired-check"
    insert_expired_test_row(name)

    query = urllib.parse.urlencode({
        "article_name": name,
    })

    status, _, body = request_json(
        "GET",
        f"/posts/check-name?{query}",
    )

    require_equal(
        status,
        200,
        "Expired-name availability check failed.",
    )

    require(
        body.get("available") is True,
        f"Expired Article Name should be reusable: {body}",
    )

    require(
        not row_exists(name),
        "Expired row still exists after check-name cleanup.",
    )


def test_expired_name_reusable_on_post() -> None:
    name = f"{TEST_PREFIX}-expired-reuse"
    old_ciphertext = make_test_veilmi_message(
        "old expired post"
    )
    new_ciphertext = make_test_veilmi_message(
        "new replacement post"
    )

    insert_expired_test_row(
        name,
        old_ciphertext,
    )

    status, _, body = request_json(
        "POST",
        "/posts",
        post_payload(
            name,
            new_ciphertext,
            2,
        ),
    )

    require_equal(
        status,
        201,
        f"Expired Article Name was not reusable: {body}",
    )

    row = get_db_row(name)

    require(
        row is not None,
        "Replacement row does not exist.",
    )

    require_equal(
        row["ciphertext"],
        new_ciphertext,
        "Replacement row did not store the new ciphertext.",
    )


# ---------------------------------------------------------------------------
# Test registration
# ---------------------------------------------------------------------------

def main() -> int:
    print("UnVeilmi Backend Availability and Security Test")
    print("=" * 72)
    print(f"Backend: {BASE_URL}")
    print(f"Database: {DB_PATH}")
    print(f"Suite ID: {SUITE_ID}")
    print()
    print(
        "This suite is self-contained and does not require demo_seed.sql."
    )
    print()

    preflight_or_exit()
    cleanup_test_rows()

    runner = TestRunner()

    try:
        # Availability / database foundation
        runner.run(
            "Database schema contains required posts fields",
            test_database_schema,
        )
        runner.run(
            "Backend health endpoint",
            test_health_endpoint,
        )

        # CORS / API surface
        runner.run(
            "Allowed frontend CORS origin",
            test_allowed_cors_origin,
        )
        runner.run(
            "Disallowed CORS origin is not approved",
            test_disallowed_cors_origin,
        )
        runner.run(
            "CORS preflight for POST",
            test_cors_preflight,
        )
        runner.run(
            "Unsupported DELETE method remains unavailable",
            test_unsupported_delete_method,
        )

        # Article Name validation and availability
        runner.run(
            "Unused Article Name is available",
            test_name_availability_for_unused_name,
        )
        runner.run(
            "Empty Article Name is rejected",
            test_empty_name_rejected,
        )
        runner.run(
            "Article Name over 50 characters is rejected",
            test_name_over_50_characters_rejected,
        )

        # Successful POST / GET / DB integration
        runner.run(
            "Free-tier POST + DB trigger + response privacy",
            test_valid_free_tier_post_and_db_trigger,
        )
        runner.run(
            "Existing Article Name becomes unavailable",
            test_existing_name_becomes_unavailable,
        )
        runner.run(
            "Existing post can be retrieved exactly",
            test_retrieve_existing_post,
        )
        runner.run(
            "Duplicate Article Name is rejected with 409",
            test_duplicate_name_rejected,
        )

        # Pricing and limits
        runner.run(
            "Incorrect client price is rejected without INSERT",
            test_incorrect_price_rejected_without_insert,
        )
        runner.run(
            "Small ciphertext becomes billable after 24 hours",
            test_small_ciphertext_after_24_hours_is_billable,
        )
        runner.run(
            "Ciphertext over 1 KB is billable within 24 hours",
            test_large_ciphertext_within_24_hours_is_billable,
        )
        runner.run(
            "Maximum 8760-hour storage duration is accepted",
            test_maximum_storage_duration_accepted,
        )
        runner.run(
            "Minimum 1-hour storage contract is accepted",
            test_one_hour_minimum_contract,
        )
        runner.run(
            "Zero-hour storage is rejected",
            test_zero_storage_hours_rejected,
        )
        runner.run(
            "Storage duration above 8760 hours is rejected",
            test_storage_above_maximum_rejected,
        )
        runner.run(
            "Negative price is rejected",
            test_negative_price_rejected,
        )

        # Request validation
        runner.run(
            "POST Article Name over 50 characters is rejected",
            test_post_name_over_50_characters_rejected,
        )
        runner.run(
            "Missing required POST field is rejected",
            test_missing_required_field_rejected,
        )
        runner.run(
            "Malformed JSON is rejected",
            test_malformed_json_rejected,
        )

        # Injection / encoding behavior
        runner.run(
            "SQL-injection-style Article Name is treated literally",
            test_sql_injection_style_article_name_is_literal,
        )
        runner.run(
            "Unicode Article Name round-trips exactly",
            test_unicode_article_name_round_trip,
        )

        # Veilmi validator compatibility
        runner.run(
            "Supported Veilmi PBKDF2 iteration counts",
            test_supported_veilmi_iterations,
        )

        invalid_veilmi_cases = [
            (
                "Malformed VEILMI1 payload",
                "VEILMI1:not-a-real-envelope",
            ),
            (
                "Wrong Veilmi prefix",
                "VEILMI2:not-a-real-envelope",
            ),
            (
                "Unsupported Veilmi version",
                make_test_veilmi_message(
                    "bad version",
                    version=2,
                ),
            ),
            (
                "Unsupported Veilmi KDF",
                make_test_veilmi_message(
                    "bad kdf",
                    kdf="PBKDF2-SHA1",
                ),
            ),
            (
                "Unsupported PBKDF2 iteration count",
                make_test_veilmi_message(
                    "bad iterations",
                    iterations=12345,
                ),
            ),
            (
                "Invalid Veilmi salt length",
                make_test_veilmi_message(
                    "bad salt",
                    salt_length=15,
                ),
            ),
            (
                "Invalid Veilmi nonce length",
                make_test_veilmi_message(
                    "bad nonce",
                    nonce_length=11,
                ),
            ),
            (
                "Invalid Veilmi MAC length",
                make_test_veilmi_message(
                    "bad mac",
                    mac_length=15,
                ),
            ),
            (
                "Empty Veilmi ciphertext field",
                make_test_veilmi_message(
                    "ignored",
                    force_empty_ciphertext=True,
                ),
            ),
        ]

        for label, ciphertext in invalid_veilmi_cases:
            runner.run(
                f"Reject: {label}",
                lambda label=label, ciphertext=ciphertext: (
                    test_invalid_veilmi_case(
                        label,
                        ciphertext,
                    )
                ),
            )

        # Expiry cleanup
        runner.run(
            "Expired post is deleted during GET",
            test_expired_post_cleanup_on_get,
        )
        runner.run(
            "Expired post is deleted during check-name",
            test_expired_post_cleanup_on_check_name,
        )
        runner.run(
            "Expired Article Name can be reused during POST",
            test_expired_name_reusable_on_post,
        )

    finally:
        cleanup_test_rows()

    return runner.summary()


if __name__ == "__main__":
    sys.exit(main())
