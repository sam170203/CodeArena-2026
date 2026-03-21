import time
import json
import random
import logging
from typing import Optional, List, Dict, Any

import requests

logger = logging.getLogger(__name__)

try:
    import redis
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    redis_client.ping()
except Exception:
    redis_client = None

CF_API_BASE = "https://codeforces.com/api"


class CodeforcesService:

    _rate_last = 0
    _rate_limit = 2

    @staticmethod
    def _rate_guard():
        now = time.time()
        elapsed = now - CodeforcesService._rate_last
        if elapsed < CodeforcesService._rate_limit:
            time.sleep(CodeforcesService._rate_limit - elapsed)
        CodeforcesService._rate_last = time.time()

    @staticmethod
    def _safe_request(url: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        try:
            response = requests.get(url, params=params, timeout=10)
            return response.json()
        except Exception as e:
            logger.error(f"CF API request failed: {e}")
            return None

    @staticmethod
    def fetch_problemset() -> List[Dict[str, Any]]:
        cache_key = "cf_problemset"

        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    val = cached.decode() if isinstance(cached, bytes) else cached
                    return json.loads(val)
            except Exception:
                pass

        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/problemset.problems"
        data = CodeforcesService._safe_request(url)

        if data is None or data.get("status") != "OK":
            logger.error("CF problemset fetch failed")
            return []

        problems = data["result"]["problems"]

        if redis_client:
            try:
                redis_client.set(cache_key, json.dumps(problems), ex=3600)
            except Exception:
                pass

        return problems

    @staticmethod
    def _map_problem(p: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": f"{p.get('contestId')}-{p.get('index')}",
            "contest_id": p.get("contestId"),
            "index": p.get("index"),
            "name": p.get("name"),
            "rating": p.get("rating"),
            "tags": p.get("tags", []),
            "time_limit": p.get("timeLimit"),
            "memory_limit": p.get("memoryLimit"),
        }

    @staticmethod
    def generate_practice(
        rating: int,
        count: int,
        tags: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        problems = CodeforcesService.fetch_problemset()

        filtered = [
            p for p in problems
            if p.get("rating") and abs(p["rating"] - rating) <= 200
        ]

        if tags:
            filtered = [
                p for p in filtered
                if any(t in p.get("tags", []) for t in tags)
            ]

        if not filtered:
            return []

        selected = random.sample(filtered, min(count, len(filtered)))
        return [CodeforcesService._map_problem(p) for p in selected]

    @staticmethod
    def fetch_user_rating(handle: str) -> Optional[Dict[str, Any]]:
        cache_key = f"cf_user_rating:{handle}"

        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    val = cached.decode() if isinstance(cached, bytes) else cached
                    return json.loads(val)
            except Exception:
                pass

        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/user.rating"
        data = CodeforcesService._safe_request(url, {"handle": handle})

        if data is None or data.get("status") != "OK":
            logger.warning(f"CF rating fetch failed for {handle}")
            return None

        contests = data.get("result", [])
        if not contests:
            return None

        latest = contests[-1]
        return {
            "handle": handle,
            "current_rating": latest.get("newRating"),
            "max_rating": max(c.get("newRating", 0) for c in contests),
            "rank": latest.get("rank"),
        }

    @staticmethod
    def fetch_submission_status(handle: str, count: int = 50) -> List[Dict[str, Any]]:
        cache_key = f"cf_submissions:{handle}"

        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    val = cached.decode() if isinstance(cached, bytes) else cached
                    return json.loads(val)
            except Exception:
                pass

        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/user.status"
        data = CodeforcesService._safe_request(url, {"handle": handle})

        if data is None or data.get("status") != "OK":
            logger.warning(f"CF submissions fetch failed for {handle}")
            return []

        submissions = data.get("result", [])[:count]
        return [
            {
                "id": s.get("id"),
                "problem_id": f"{s['problem'].get('contestId')}-{s['problem'].get('index')}",
                "verdict": s.get("verdict"),
                "time_ms": s.get("timeConsumedMillis"),
                "memory_kb": s.get("memoryConsumedBytes", 0) // 1024,
                "language": s.get("programmingLanguage"),
            }
            for s in submissions
        ]

    @staticmethod
    def _parse_problem_id(problem_id: str) -> tuple[Optional[int], Optional[str]]:
        try:
            parts = str(problem_id).split("-")
            if len(parts) == 3 and parts[0] == "cf":
                try:
                    contest_id = int(parts[1])
                    index = parts[2]
                    return contest_id, index
                except Exception:
                    return None, None
            else:
                return None, None
        except (ValueError, IndexError):
            return None, None

    @staticmethod
    def check_problem_solved(handle: str, problem_id: str) -> Optional[Dict[str, Any]]:
        contest_id, index = CodeforcesService._parse_problem_id(problem_id)

        if contest_id is None or index is None:
            logger.warning(f"Invalid problem_id format: {problem_id}")
            return {"solved": False, "submission_time": None, "verdict": "INVALID_PROBLEM_ID"}

        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/user.status"
        data = CodeforcesService._safe_request(url, {"handle": handle})

        if data is None or data.get("status") != "OK":
            logger.error(f"CF user.status failed for {handle}")
            return None

        submissions = data.get("result", [])

        for sub in submissions:
            prob = sub.get("problem", {})
            if prob.get("contestId") == contest_id and prob.get("index") == index:
                verdict = sub.get("verdict", "")
                if verdict == "OK":
                    return {
                        "solved": True,
                        "submission_time": sub.get("creationTimeSeconds"),
                        "verdict": verdict,
                        "time_ms": sub.get("timeConsumedMillis"),
                        "memory_kb": sub.get("memoryConsumedBytes", 0) // 1024,
                    }
                return {
                    "solved": False,
                    "submission_time": sub.get("creationTimeSeconds"),
                    "verdict": verdict,
                }

        return {"solved": False, "submission_time": None, "verdict": "NO_SUBMISSION"}
