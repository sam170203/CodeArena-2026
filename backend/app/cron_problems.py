import asyncio
import requests


async def refresh_problemset():
    while True:
        try:
            resp = requests.get(
                "https://codeforces.com/api/problemset.problems",
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                problems = data.get("result", {}).get("problems", [])

                print(f"[CRON] refreshed {len(problems)} problems")

        except Exception as e:
            print(f"[CRON ERROR] {e}")

        await asyncio.sleep(3600)  # run every 1 hour


def start_periodic_problemset_refresh():
    loop = asyncio.get_event_loop()
    loop.create_task(refresh_problemset())