import time
import requests
import redis
import json
import random   # ✅ added

CF_API_BASE = "https://codeforces.com/api"

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


class CodeforcesService:

    _rate_last = 0

    @staticmethod
    def _rate_guard():
        now = time.time()

        if now - CodeforcesService._rate_last < 1:
            time.sleep(1 - (now - CodeforcesService._rate_last))

        CodeforcesService._rate_last = time.time()

    @staticmethod
    def fetch_problemset():
        cache_key = "cf_problemset"

        try:
            cached = redis_client.get(cache_key)
        except Exception:
            cached = None

        if cached:
            return json.loads(cached)

        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/problemset.problems"
        response = requests.get(url, timeout=10)
        data = response.json()

        if data["status"] != "OK":
            raise Exception("Codeforces API error")

        problems = data["result"]["problems"]

        try:
            redis_client.set(cache_key, json.dumps(problems), ex=3600)
        except Exception:
            pass

        return problems

    @staticmethod
    def generate_practice(rating: int, count: int):
        problems = CodeforcesService.fetch_problemset()   # ✅ fixed

        filtered = [
            p for p in problems
            if p.get("rating") and abs(p["rating"] - rating) <= 200
        ]

        return random.sample(filtered, min(count, len(filtered)))   # ✅ works