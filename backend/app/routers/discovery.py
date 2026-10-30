from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models import User
from app.schemas import AIListingAssistantRequest, AIListingAssistantResponse
from app.services.ai_service import generate_listing_copy

router = APIRouter()


def _now():
    return datetime.now(timezone.utc)


@router.post("/ai/listing-assistant", response_model=AIListingAssistantResponse)
def listing_assistant(
    payload: AIListingAssistantRequest,
    current_user: User = Depends(get_current_user),
):
    if payload.listing_type in {"property", "food"} and current_user.role not in {"owner", "admin"}:
        raise HTTPException(
            status_code=403,
            detail="Owner access is required for property and food listing assistance.",
        )
    result, powered = generate_listing_copy(
        payload.listing_type, payload.draft, payload.instruction
    )
    return {**result, "ai_powered": powered}


@router.get("/admin/verification")
def admin_verification_queue(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(User).where(User.role == "owner").order_by(User.created_at.desc())
    ).all()
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "owner_verified": user.owner_verified,
            "verified_at": user.verified_at,
            "created_at": user.created_at,
        }
        for user in rows
    ]


@router.patch("/admin/users/{user_id}/verification")
def update_owner_verification(
    user_id: int,
    verified: bool,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user or user.role != "owner":
        raise HTTPException(404, "Owner account not found.")
    user.owner_verified = verified
    user.verified_by = current_user.id if verified else None
    user.verified_at = _now() if verified else None
    db.commit()
    return {
        "id": user.id,
        "owner_verified": user.owner_verified,
        "verified_at": user.verified_at,
    }
