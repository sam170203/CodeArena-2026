from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Deck, User
from app.api.routes.auth import _get_current_user

router = APIRouter(prefix="/deck", tags=["deck"])


CF_TAGS = [
    "dp",
    "graphs",
    "greedy",
    "math",
    "implementation",
    "data structures",
    "strings",
    "geometry",
    "number theory",
    "two pointers",
    "dfs and similar",
    "binary search",
    "combinatorics",
    "bitmasks",
    "trees",
    "constructive algorithms",
    "brute force",
    "sortings",
    "hashing",
    "divide and conquer",
]


class DeckUpdate(BaseModel):
    tags: List[str]


@router.get("/me")
def my_deck(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Deck).filter(Deck.user_id == current_user.id).first()
    tags = json.loads(row.tags_json) if row else []
    return {"tags": tags, "available": CF_TAGS}


@router.put("/me")
def set_my_deck(
    body: DeckUpdate,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    cleaned = [t.lower().strip() for t in body.tags if t.strip()]
    cleaned = [t for t in cleaned if t in CF_TAGS][:3]
    row = db.query(Deck).filter(Deck.user_id == current_user.id).first()
    if not row:
        row = Deck(user_id=current_user.id, tags_json=json.dumps(cleaned))
        db.add(row)
    else:
        row.tags_json = json.dumps(cleaned)
    db.commit()
    return {"tags": cleaned}
