"""24h SQLite cache for external tool calls (places/events/weather/geocode).

Demo runs re-query the same area/date repeatedly, so caching keeps them fast
and avoids burning free-tier quota (see spec risk: "Tool APIs rate-limit or
lack data for the demo city").
"""

import functools
import hashlib
import json
from datetime import datetime, timedelta, timezone

from app.db import get_connection

CACHE_TTL = timedelta(hours=24)


def _cache_key(namespace: str, kwargs: dict) -> str:
    raw = namespace + "|" + json.dumps(kwargs, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


def get_cached(namespace: str, kwargs: dict):
    key = _cache_key(namespace, kwargs)
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT response, created_at FROM tool_cache WHERE key = ?", (key,)
        ).fetchone()
        if row is None:
            return None
        created_at = datetime.fromisoformat(row["created_at"])
        if datetime.now(timezone.utc) - created_at > CACHE_TTL:
            return None
        return json.loads(row["response"])
    finally:
        conn.close()


def set_cached(namespace: str, kwargs: dict, response) -> None:
    key = _cache_key(namespace, kwargs)
    conn = get_connection()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO tool_cache (key, response, created_at) VALUES (?, ?, ?)",
            (key, json.dumps(response), datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def cached(namespace: str):
    """Decorator for a tool function called with keyword args only.

    Caches the JSON-serializable return value for 24h, keyed on the function's
    arguments. Errors are never cached - a transient API failure shouldn't
    stick around for a day.
    """

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(**kwargs):
            hit = get_cached(namespace, kwargs)
            if hit is not None:
                return hit
            result = fn(**kwargs)
            set_cached(namespace, kwargs, result)
            return result

        return wrapper

    return decorator
