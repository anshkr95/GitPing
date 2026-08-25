"""Settings routes"""

from fastapi import APIRouter, Body, HTTPException
from typing import Any
from app.core import db
from app.core.mailer import send_welcome_email
from app.config import get_settings as get_env_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings():
    settings = db.get_settings()
    token = settings.get("githubToken", "")
    masked = ""
    if token and len(token) > 8:
        masked = f"{token[:4]}...{token[-4:]}"
    return {
        "settings": {
            **settings,
            "hasToken": bool(token),
            "maskedToken": masked,
        }
    }


@router.post("")
async def update_settings(data: dict[str, Any] = Body(...)):
    before = db.get_settings()
    updated = db.update_settings(data)

    # Send one-time welcome email on initial email setup
    email = data.get("email", "").strip() if isinstance(data.get("email"), str) else ""
    wants_email = updated.get("emailEnabled", True)
    if "@" in email and wants_email and not before.get("welcomeEmailSent", False):
        result = await send_welcome_email(email)
        if result.get("success"):
            db.update_settings({"welcomeEmailSent": True})

    return {"settings": db.get_settings(), "success": True}


@router.post("/test-email")
async def test_email(data: dict[str, Any] = Body(...)):
    email = data.get("email", "").strip() if isinstance(data.get("email"), str) else ""
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email address required")

    cfg = get_env_settings()
    if not cfg.smtp_configured:
        raise HTTPException(
            status_code=400,
            detail="SMTP credentials missing. Please set SMTP_USER and SMTP_PASS environment variables.",
        )

    result = await send_welcome_email(email)
    if result.get("success"):
        return {"success": True, "message": f"Test email dispatched to {email}"}
    else:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", f"Failed to send via {cfg.smtp_host}"),
        )
