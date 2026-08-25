"""GitHub webhook handler"""

from __future__ import annotations

import random
import string
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request
from app.core import db
from app.core.matcher import match_issue_labels
from app.core.mailer import send_issue_alert_email

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def _rand_id(length: int = 4) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def _ts() -> int:
    return int(time.time() * 1000)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/github")
async def github_webhook(request: Request):
    """Process GitHub webhook payloads for 'opened' and 'labeled' actions."""
    try:
        payload = await request.json()
        action = payload.get("action")
        issue = payload.get("issue")
        repository = payload.get("repository")

        if not issue or not repository:
            return {"message": "Ignored: No issue or repository payload"}

        if action not in ("opened", "labeled"):
            return {"message": f"Ignored action: {action}"}

        repo_full_name = repository.get("full_name", "")
        sub = db.get_subscription_by_repo(repo_full_name)

        if not sub or not sub.get("isActive", True):
            return {"message": f"Repository {repo_full_name} is not actively tracked"}

        issue_number = issue.get("number", 0)
        if db.has_seen_issue(repo_full_name, issue_number):
            return {"message": "Issue already processed"}

        raw_labels = issue.get("labels", [])
        match_result = match_issue_labels(
            raw_labels,
            sub.get("trackedLabels", []),
            sub.get("matchMode", "any"),
        )

        if not match_result["isMatch"]:
            return {"matched": False, "reason": match_result["reason"]}

        detected: dict[str, Any] = {
            "id": f"issue_{_ts()}_{issue_number}",
            "subscriptionId": sub.get("id", ""),
            "repoFullName": repo_full_name,
            "issueNumber": issue_number,
            "issueTitle": issue.get("title", ""),
            "issueBody": issue.get("body", ""),
            "issueUrl": issue.get("html_url", ""),
            "authorLogin": (issue.get("user") or {}).get("login", "unknown"),
            "authorAvatar": (issue.get("user") or {}).get("avatar_url", ""),
            "labels": [
                {
                    "name": l.get("name", ""),
                    "color": (l.get("color") or "cccccc").lstrip("#"),
                    "description": l.get("description", ""),
                }
                for l in raw_labels
            ],
            "matchedLabels": match_result["matchedLabels"],
            "createdAt": issue.get("created_at") or _now_iso(),
            "detectedAt": _now_iso(),
            "isRead": False,
        }
        db.add_detected_issue(detected)

        settings = db.get_settings()
        notif: dict[str, Any] = {
            "id": f"notif_{_ts()}_{_rand_id()}",
            "issueId": detected["id"],
            "subscriptionId": sub.get("id", ""),
            "repoFullName": repo_full_name,
            "issueNumber": issue_number,
            "issueTitle": issue.get("title", ""),
            "issueUrl": issue.get("html_url", ""),
            "matchedLabels": match_result["matchedLabels"],
            "createdAt": _now_iso(),
            "isRead": False,
            "channels": {
                "inApp": True,
                "browser": settings.get("browserNotifyEnabled", True),
                "email": settings.get("emailEnabled", True),
            },
            "emailSentTo": settings.get("email", "") if settings.get("emailEnabled", True) else None,
        }
        db.add_notification(notif)

        if settings.get("emailEnabled", True):
            await send_issue_alert_email(detected, sub)

        return {
            "matched": True,
            "issueNumber": issue_number,
            "repo": repo_full_name,
            "matchedLabels": match_result["matchedLabels"],
        }
    except Exception as exc:
        return {"error": str(exc)}
