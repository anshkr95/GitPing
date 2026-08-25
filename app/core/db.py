"""
JSON-file database - JSON-file database with atomic writes.
"""

from __future__ import annotations

import json
import os
import time
import random
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.models import (
    Subscription,
    DetectedIssue,
    NotificationItem,
    UserSettings,
)
from app.config import get_settings as _get_env_settings


def _rand_id(length: int = 5) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_db_dir() -> Path:
    """Use .data/ locally, /tmp/gitping-data in production."""
    if os.environ.get("RENDER") or os.environ.get("RAILWAY"):
        return Path("/tmp/gitping-data")
    return Path.cwd() / ".data"


DB_DIR = _get_db_dir()
DB_FILE = DB_DIR / "radar-db.json"


def _default_settings() -> dict:
    cfg = _get_env_settings()
    return UserSettings(
        email=cfg.gitping_alert_email,
        email_enabled=True,
        sound_enabled=True,
        browser_notify_enabled=True,
        polling_interval_seconds=60,
        github_token=cfg.github_token,
        welcome_email_sent=False,
    ).model_dump(by_alias=True)


def _ensure_dir() -> None:
    try:
        DB_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


def _read() -> dict:
    """Read the full database from disk, returning defaults on any error."""
    _ensure_dir()
    try:
        if DB_FILE.exists():
            raw = json.loads(DB_FILE.read_text(encoding="utf-8"))
            return {
                "subscriptions": raw.get("subscriptions") or [],
                "detectedIssues": raw.get("detectedIssues") or [],
                "notifications": raw.get("notifications") or [],
                "settings": {**_default_settings(), **(raw.get("settings") or {})},
                "seenIssueIds": raw.get("seenIssueIds") or [],
            }
    except Exception:
        pass
    return {
        "subscriptions": [],
        "detectedIssues": [],
        "notifications": [],
        "settings": _default_settings(),
        "seenIssueIds": [],
    }


def _write(data: dict) -> None:
    _ensure_dir()
    try:
        DB_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as exc:
        print(f"[DB] Failed to write: {exc}")



def get_subscriptions() -> list[dict]:
    return _read()["subscriptions"]


def get_subscription(sub_id: str) -> Optional[dict]:
    for s in _read()["subscriptions"]:
        if s.get("id") == sub_id:
            return s
    return None


def get_subscription_by_repo(repo_full_name: str) -> Optional[dict]:
    for s in _read()["subscriptions"]:
        if s.get("repoFullName", "").lower() == repo_full_name.lower():
            return s
    return None


def add_subscription(sub: dict) -> dict:
    data = _read()
    existing = None
    for s in data["subscriptions"]:
        if s.get("repoFullName", "").lower() == sub.get("repoFullName", "").lower():
            existing = s
            break

    if existing:
        existing["trackedLabels"] = sub.get("trackedLabels", existing["trackedLabels"])
        existing["matchMode"] = sub.get("matchMode", existing["matchMode"])
        existing["isActive"] = sub.get("isActive", True)
        _write(data)
        return existing

    now = _now_iso()
    new_sub = {
        **sub,
        "id": f"sub_{int(time.time() * 1000)}_{_rand_id()}",
        "createdAt": now,
        "lastCheckedAt": now,
        "matchedCount": 0,
        "isActive": sub.get("isActive", True),
    }
    data["subscriptions"].insert(0, new_sub)
    _write(data)
    return new_sub


def update_subscription(sub_id: str, updates: dict) -> Optional[dict]:
    data = _read()
    for i, s in enumerate(data["subscriptions"]):
        if s.get("id") == sub_id:
            data["subscriptions"][i] = {**s, **updates}
            _write(data)
            return data["subscriptions"][i]
    return None


def delete_subscription(sub_id: str) -> bool:
    data = _read()
    prev_len = len(data["subscriptions"])
    data["subscriptions"] = [s for s in data["subscriptions"] if s.get("id") != sub_id]
    if len(data["subscriptions"]) != prev_len:
        _write(data)
        return True
    return False


def get_detected_issues(limit: int = 50) -> list[dict]:
    return _read()["detectedIssues"][:limit]


def add_detected_issue(issue: dict) -> None:
    data = _read()
    key = f"{issue['repoFullName']}#{issue['issueNumber']}"
    if key not in data["seenIssueIds"]:
        data["seenIssueIds"].append(key)
    data["detectedIssues"].insert(0, issue)
    if len(data["detectedIssues"]) > 200:
        data["detectedIssues"] = data["detectedIssues"][:200]
    # increment matched count on the subscription
    for s in data["subscriptions"]:
        if s.get("id") == issue.get("subscriptionId") or \
           s.get("repoFullName", "").lower() == issue.get("repoFullName", "").lower():
            s["matchedCount"] = s.get("matchedCount", 0) + 1
            break
    _write(data)


def has_seen_issue(repo_full_name: str, issue_number: int) -> bool:
    key = f"{repo_full_name}#{issue_number}"
    return key in _read()["seenIssueIds"]


def mark_issue_read(issue_id: str) -> bool:
    data = _read()
    for iss in data["detectedIssues"]:
        if iss.get("id") == issue_id:
            iss["isRead"] = True
            _write(data)
            return True
    return False


def get_notifications(limit: int = 30) -> list[dict]:
    return _read()["notifications"][:limit]


def add_notification(notif: dict) -> None:
    data = _read()
    data["notifications"].insert(0, notif)
    if len(data["notifications"]) > 100:
        data["notifications"] = data["notifications"][:100]
    _write(data)


def mark_notification_read(notif_id: str) -> bool:
    data = _read()
    for n in data["notifications"]:
        if n.get("id") == notif_id:
            n["isRead"] = True
            _write(data)
            return True
    return False


def mark_all_notifications_read() -> None:
    data = _read()
    for n in data["notifications"]:
        n["isRead"] = True
    for i in data["detectedIssues"]:
        i["isRead"] = True
    _write(data)


def clear_notifications() -> None:
    data = _read()
    data["notifications"] = []
    _write(data)


def get_settings() -> dict:
    data = _read()
    settings = data["settings"]
    env = _get_env_settings()
    if env.gitping_alert_email and not settings.get("email"):
        settings["email"] = env.gitping_alert_email
    if env.github_token and not settings.get("githubToken"):
        settings["githubToken"] = env.github_token
    return settings


def update_settings(updates: dict) -> dict:
    data = _read()
    data["settings"] = {**data["settings"], **updates}
    _write(data)
    return data["settings"]
