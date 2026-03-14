import time
import requests
import redis
import json

CF_API_BASE = "https://codeforces.com/api"

# Redis connection
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

        cache_key = "cf:problemset"

        cached = redis_client.get(cache_key)

        if cached:
            return json.loads(cached)

        CodeforcesService._rate_guard()

        url = f"{CF_API_BASE}/problemset.problems"

        response = requests.get(url, timeout=10)

        data = response.json()

        if data["status"] != "OK":
            raise Exception("Codeforces API error")

        problems = data["result"]["problems"]

        redis_client.setex(cache_key, 3600, json.dumps(problems))

        return problems