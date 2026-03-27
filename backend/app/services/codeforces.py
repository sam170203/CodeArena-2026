import json
import logging
import random
import time
from typing import Any, Dict, List, Optional

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
    _rate_last = 0.0
    _rate_limit = 2.0

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
            response = requests.get(
                url,
                params=params,
                timeout=10,
                headers={"User-Agent": "CodeArena/1.0"},
            )
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
                    return json.loads(cached)
            except Exception:
                pass

        CodeforcesService._rate_guard()
        data = CodeforcesService._safe_request(f"{CF_API_BASE}/problemset.problems")

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
        tags: Optional[List[str]] = None,
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
                    return json.loads(cached)
            except Exception:
                pass

        CodeforcesService._rate_guard()
        data = CodeforcesService._safe_request(f"{CF_API_BASE}/user.rating", {"handle": handle})

        if data is None or data.get("status") != "OK":
            logger.warning(f"CF rating fetch failed for {handle}")
            return None

        contests = data.get("result", [])
        if not contests:
            return None

        latest = contests[-1]
        result = {
            "handle": handle,
            "current_rating": latest.get("newRating"),
            "max_rating": max(c.get("newRating", 0) for c in contests),
            "rank": latest.get("rank"),
        }

        if redis_client:
            try:
                redis_client.set(cache_key, json.dumps(result), ex=600)
            except Exception:
                pass

        return result

    @staticmethod
    def fetch_submission_status(handle: str, count: int = 50) -> List[Dict[str, Any]]:
        cache_key = f"cf_submissions:{handle}"

        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass

        CodeforcesService._rate_guard()
        data = CodeforcesService._safe_request(f"{CF_API_BASE}/user.status", {"handle": handle})

        if data is None or data.get("status") != "OK":
            logger.warning(f"CF submissions fetch failed for {handle}")
            return []

        submissions = data.get("result", [])[:count]
        result = []

        for s in submissions:
            problem = s.get("problem") or {}
            contest_id = problem.get("contestId")
            index = problem.get("index")
            result.append(
                {
                    "id": s.get("id"),
                    "problem_id": f"{contest_id}-{index}" if contest_id is not None and index else None,
                    "contest_id": contest_id,
                    "index": index,
                    "verdict": s.get("verdict"),
                    "time_ms": s.get("timeConsumedMillis"),
                    "memory_kb": (s.get("memoryConsumedBytes") or 0) // 1024,
                    "language": s.get("programmingLanguage"),
                }
            )

        if redis_client:
            try:
                redis_client.set(cache_key, json.dumps(result), ex=120)
            except Exception:
                pass

        return result

    @staticmethod
    def _normalize_problem_id(problem_id: str) -> tuple[Optional[int], Optional[str]]:
        try:
            pid = str(problem_id).strip()
            if pid.startswith("cf-"):
                pid = pid[3:]

            contest_id_str, index = pid.split("-", 1)
            return int(contest_id_str), index
        except Exception:
            return None, None

    @staticmethod
    def check_problem_solved(handle: str, problem_id: str) -> Optional[Dict[str, Any]]:
        contest_id, index = CodeforcesService._normalize_problem_id(problem_id)

        if contest_id is None or index is None:
            return {"solved": False, "submission_time": None, "verdict": "INVALID_PROBLEM_ID"}

        wanted_plain = f"{contest_id}-{index}"
        wanted_cf = f"cf-{contest_id}-{index}"

        submissions = CodeforcesService.fetch_submission_status(handle, count=1000)

        for sub in submissions:
            pid = sub.get("problem_id")
            if pid not in {wanted_plain, wanted_cf}:
                continue

            verdict = sub.get("verdict", "")
            if verdict == "OK":
                return {
                    "solved": True,
                    "submission_time": None,
                    "verdict": verdict,
                    "time_ms": sub.get("time_ms"),
                    "memory_kb": sub.get("memory_kb"),
                }

            return {
                "solved": False,
                "submission_time": None,
                "verdict": verdict,
            }

        return {"solved": False, "submission_time": None, "verdict": "NO_SUBMISSION"}


def get_user_info(handle: str):
    data = CodeforcesService.fetch_user_rating(handle)
    if not data:
        raise Exception("Invalid handle")

    return {
        "handle": handle,
        "rating": data.get("current_rating", 0),
        "rank": data.get("rank", "unrated"),
    }


def get_user_solved_problems(handle: str):
    submissions = CodeforcesService.fetch_submission_status(handle, count=1000)

    solved = set()
    solved_list = []

    for sub in submissions:
        if sub.get("verdict") != "OK":
            continue

        contest_id = sub.get("contest_id")
        index = sub.get("index")
        if contest_id is None or not index:
            continue

        key = (contest_id, index)
        if key in solved:
            continue

        solved.add(key)
        solved_list.append((contest_id, index, None, None))

    return solved_list