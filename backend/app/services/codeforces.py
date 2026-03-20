import time
import json
import random
from typing import Optional, List, Dict, Any

import requests

try:
    import redis
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    redis_client.ping()
except Exception:
    redis_client = None

CF_API_BASE = "https://codeforces.com/api"


class CodeforcesService:

    _rate_last = 0

    @staticmethod
    def _rate_guard():
        now = time.time()
        if now - CodeforcesService._rate_last < 1:
            time.sleep(1 - (now - CodeforcesService._rate_last))
        CodeforcesService._rate_last = time.time()

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
        response = requests.get(url, timeout=10)
        data = response.json()

        if data["status"] != "OK":
            raise Exception("Codeforces API error")

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
        params = {"handle": handle}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data["status"] != "OK":
            return None

        contests = data["result"]
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
    def fetch_submission_status(handle: str, count: int = 10) -> List[Dict[str, Any]]:
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
        params = {"handle": handle}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data["status"] != "OK":
            return []

        submissions = data["result"][:count]
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
    def check_problem_solved(handle: str, problem_id: str) -> Optional[Dict[str, Any]]:
        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/user.status"
        params = {"handle": handle}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data["status"] != "OK":
            return None

        submissions = data["result"]
        parts = problem_id.split("-")
        contest_id = int(parts[0]) if len(parts) > 1 and parts[0].isdigit() else None
        index = parts[-1]

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

        return {"solved": False, "submission_time": None}
