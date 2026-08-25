"""Notification routes"""

from fastapi import APIRouter, Body, HTTPException
from typing import Any
from app.core import db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications():
    notifications = db.get_notifications()
    unread_count = sum(1 for n in notifications if not n.get("isRead", False))
    return {"notifications": notifications, "unreadCount": unread_count}


@router.patch("")
async def update_notification(data: dict[str, Any] = Body(...)):
    if data.get("markAll"):
        db.mark_all_notifications_read()
        return {"success": True, "message": "All marked as read"}

    notif_id = data.get("id")
    if not notif_id:
        raise HTTPException(status_code=400, detail="id or markAll required")

    success = db.mark_notification_read(notif_id)
    return {"success": success, "id": notif_id}


@router.delete("")
async def clear_notifications():
    db.clear_notifications()
    return {"success": True, "message": "Notifications cleared"}
