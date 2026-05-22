from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/cf", tags=["codeforces"])


@router.get("/handle/{handle}/validate")
async def validate_handle(handle: str):
    url = f"https://codeforces.com/api/user.info?handles={handle}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
        data = r.json()
    except Exception:
        return {"exists": False, "reason": "unreachable"}
    return {
        "exists": data.get("status") == "OK",
        "reason": data.get("comment"),
    }
