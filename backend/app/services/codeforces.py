# backend/app/services/codeforces.py
"""
Codeforces API integration service for CodeArena.

Responsibilities:
- fetch_problemset (cached in Redis)
- fetch_problem_by_id
- fetch_user_rating
- fetch_submission_status

Caching:
- Uses Redis when available, caches problemset under key "cf:problemset:problems" for TTL seconds.
- TTL defaults to 3600 (1 hour).

Rate limiting:
- Simple in-process guard to avoid more than ~1 request/sec to Codeforces API from this process.
  This is lightweight and intended to reduce accidental bursts; production should use a more
  robust rate limiter / shared token bucket if running multiple instances.
"""

from __future__ import annotations

import json
import os
import time
import threading
from typing import Any, Dict, List, Optional

import requests

# entity reference for Codeforces (human-readable in logs)
CF_NAME = ""

# Config
CF_API_BASE = "https://codeforces.com/api"
DEFAULT_TTL_SEC = int(os.getenv("CF_PROBLEMSET_TTL", "3600"))  # 1 hour default
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Simple in-process rate limiter
_last_request_time = 0.0
_rate_lock = threading.Lock()
_MIN_INTERVAL = 1.0  # seconds between API calls


def _sleep_to_respect_rate() -> None:
    global _last_request_time
    with _rate_lock:
        now = time.time()
        elapsed = now - _last_request_time
        if elapsed < _MIN_INTERVAL:
            to_sleep = _MIN_INTERVAL - elapsed
            time.sleep(to_sleep)
        _last_request_time = time.time()


def _get_redis_client():
    try:
        import redis as _redis  # local import optional
        return _redis.Redis.from_url(REDIS_URL)
    except Exception:
        return None


def _redis_get_json(key: str) -> Optional[Any]:
    r = _get_redis_client()
    if not r:
        return None
    try:
        val = r.get(key)
        if not val:
            return None
        if isinstance(val, (bytes, bytearray)):
            val = val.decode()
        return json.loads(val)
    except Exception:
        return None


def _redis_set_json(key: str, obj: Any, ttl: int) -> None:
    r = _get_redis_client()
    if not r:
        return
    try:
        r.set(key, json.dumps(obj), ex=ttl)
    except Exception:
        # best-effort caching; never fail the request for cache issues
        return


def _http_get(url: str, params: Optional[Dict[str, Any]] = None, timeout: int = 8) -> Dict[str, Any]:
    try:
        _sleep_to_respect_rate()
        resp = requests.get(url, params=params, timeout=timeout)
        if resp.status_code == 200:
            return resp.json()
        return {"status": "ERROR", "result": []}
    except Exception:
        return {"status": "ERROR", "result": []}


class CodeforcesService:
    """High-level wrapper for common Codeforces API operations."""

    @staticmethod
    def fetch_problems_raw() -> List[Dict[str, Any]]:
        """
        Fetch the raw problem list from Codeforces API (no caching).
        Returns a list of problem dicts (as returned by CF).
        """
        data = _http_get(f"{CF_API_BASE}/problemset.problems")
        if data.get("status") == "OK":
            problems = data.get("result", {}).get("problems", [])
            return problems if isinstance(problems, list) else []
        return []

    @staticmethod
    def fetch_problemset(ttl: int = DEFAULT_TTL_SEC) -> List[Dict[str, Any]]:
        """
        Return problemset, using Redis cache when available.
        Cache key: cf:problemset:problems
        """
        cache_key = "cf:problemset:problems"
        cached = _redis_get_json(cache_key)
        if cached is not None:
            return cached

        problems = CodeforcesService.fetch_problems_raw()
        if isinstance(problems, list):
            _redis_set_json(cache_key, problems, ttl)
            return problems
        return []

    @staticmethod
    def fetch_problem_by_id(problem_id: str) -> Optional[Dict[str, Any]]:
        """
        Attempt to find a problem by a problem_id. Accepts:
         - '1234-A' (contestId-index)
         - 'Problem Name' (fallback)
        Returns the raw problem dict or None.
        """
        if not problem_id:
            return None

        problems = CodeforcesService.fetch_problemset()
        # contestId-index style
        if "-" in problem_id:
            contest_id, idx = problem_id.split("-", 1)
            for p in problems:
                if str(p.get("contestId")) == str(contest_id) and p.get("index") == idx:
                    return p
        # fallback: name match
        for p in problems:
            if p.get("name") == problem_id:
                return p
        return None

    @staticmethod
    def fetch_user_rating(handle: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user info (including rating) for one user handle.
        Returns user dict or None.
        """
        if not handle:
            return None
        data = _http_get(f"{CF_API_BASE}/user.info", params={"handles": handle})
        if data.get("status") == "OK":
            res = data.get("result", [])
            if isinstance(res, list) and len(res) > 0:
                return res[0]
        return None

    @staticmethod
    def fetch_submission_status(handle: str, count: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch recent submissions for a user (user.status endpoint).
        Returns list of submissions (may be empty).
        """
        if not handle:
            return []
        data = _http_get(f"{CF_API_BASE}/user.status", params={"handle": handle, "count": count})
        if data.get("status") == "OK":
            return data.get("result", []) or []
        return []
