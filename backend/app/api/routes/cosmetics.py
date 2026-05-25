from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import CosmeticUnlock, EquippedCosmetic, User
from app.services.elo import tier_for_elo
from app.api.routes.auth import _get_current_user

router = APIRouter(prefix="/cosmetics", tags=["cosmetics"])


BANNERS = {
    "default": {"label": "Default", "css": "linear-gradient(135deg,#1a0a35,#251355)", "unlock": "default"},
    "pink-haze": {"label": "Pink haze", "css": "linear-gradient(135deg,#3a0a25,#7a1450)", "unlock": "tier:SILVER"},
    "cyan-grid": {"label": "Cyan grid", "css": "linear-gradient(135deg,#072a35,#0e6075)", "unlock": "tier:GOLD"},
    "violet-storm": {"label": "Violet storm", "css": "linear-gradient(135deg,#2a0a55,#5a25a5)", "unlock": "tier:PLATINUM"},
    "gold-rush": {"label": "Gold rush", "css": "linear-gradient(135deg,#5a2a05,#fbbf24)", "unlock": "tier:DIAMOND"},
    "rainbow": {"label": "Rainbow", "css": "conic-gradient(from 0deg,#ec4899,#a855f7,#22d3ee,#fbbf24,#ec4899)", "unlock": "tier:MASTER"},
}

GLYPHS = {
    "default": {"label": "Initial", "unlock": "default"},
    "sword": {"label": "⚔", "unlock": "default"},
    "diamond": {"label": "◆", "unlock": "tier:DIAMOND"},
    "star": {"label": "★", "unlock": "tier:GOLD"},
    "skull": {"label": "☠", "unlock": "quest:weekly_win_10"},
    "crown": {"label": "♛", "unlock": "tier:MASTER"},
}


def _tier_index(key: str) -> int:
    order = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "LEGEND"]
    return order.index(key) if key in order else -1


def _compute_default_unlocks(user: User) -> list[tuple[str, str]]:
    """Returns (axis, key) tuples that the user qualifies for."""
    unlocked = [("banner", "default"), ("glyph", "default"), ("glyph", "sword")]
    user_tier = tier_for_elo(user.elo or 1200).key
    user_idx = _tier_index(user_tier)
    for key, meta in BANNERS.items():
        if meta["unlock"] == "default":
            continue
        if meta["unlock"].startswith("tier:"):
            required = meta["unlock"].split(":")[1]
            if _tier_index(required) <= user_idx:
                unlocked.append(("banner", key))
    for key, meta in GLYPHS.items():
        if meta["unlock"] == "default":
            continue
        if meta["unlock"].startswith("tier:"):
            required = meta["unlock"].split(":")[1]
            if _tier_index(required) <= user_idx:
                unlocked.append(("glyph", key))
    return unlocked


def _sync_unlocks(db: Session, user: User) -> None:
    """Insert any cosmetic unlocks the user qualifies for but doesn't have."""
    qualified = set(_compute_default_unlocks(user))
    have = {
        (row.axis, row.key)
        for row in db.query(CosmeticUnlock).filter(CosmeticUnlock.user_id == user.id).all()
    }
    for axis, key in qualified - have:
        db.add(
            CosmeticUnlock(
                user_id=user.id,
                axis=axis,
                key=key,
                source="tier_auto",
                unlocked_at=datetime.utcnow(),
            )
        )
    db.commit()


def _get_or_create_equipped(db: Session, user_id: str) -> EquippedCosmetic:
    row = db.query(EquippedCosmetic).filter(EquippedCosmetic.user_id == user_id).first()
    if row is None:
        row = EquippedCosmetic(user_id=user_id, banner_key="default", glyph_key="default")
        db.add(row)
        db.commit()
    return row


@router.get("/me")
def my_cosmetics(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    _sync_unlocks(db, current_user)
    eq = _get_or_create_equipped(db, current_user.id)
    unlocks = (
        db.query(CosmeticUnlock).filter(CosmeticUnlock.user_id == current_user.id).all()
    )
    unlocked_banners = {u.key for u in unlocks if u.axis == "banner"}
    unlocked_glyphs = {u.key for u in unlocks if u.axis == "glyph"}
    return {
        "equipped": {"banner": eq.banner_key, "glyph": eq.glyph_key},
        "banners": [
            {**meta, "key": k, "owned": k in unlocked_banners}
            for k, meta in BANNERS.items()
        ],
        "glyphs": [
            {**meta, "key": k, "owned": k in unlocked_glyphs}
            for k, meta in GLYPHS.items()
        ],
    }


class EquipRequest(BaseModel):
    banner: Optional[str] = None
    glyph: Optional[str] = None


@router.put("/equip")
def equip(
    body: EquipRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    _sync_unlocks(db, current_user)
    eq = _get_or_create_equipped(db, current_user.id)
    if body.banner:
        owned = (
            db.query(CosmeticUnlock)
            .filter(
                CosmeticUnlock.user_id == current_user.id,
                CosmeticUnlock.axis == "banner",
                CosmeticUnlock.key == body.banner,
            )
            .first()
        )
        if not owned:
            raise HTTPException(status_code=400, detail="Banner not unlocked")
        eq.banner_key = body.banner
    if body.glyph:
        owned = (
            db.query(CosmeticUnlock)
            .filter(
                CosmeticUnlock.user_id == current_user.id,
                CosmeticUnlock.axis == "glyph",
                CosmeticUnlock.key == body.glyph,
            )
            .first()
        )
        if not owned:
            raise HTTPException(status_code=400, detail="Glyph not unlocked")
        eq.glyph_key = body.glyph
    db.commit()
    return {"equipped": {"banner": eq.banner_key, "glyph": eq.glyph_key}}
