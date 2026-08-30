"""
Async scan engine
"""

from __future__ import annotations

import random
import string
import time
from datetime import datetime, timezone
from typing import Any

from app.core import db as database
from app.core.github import get_recent_issues
from app.core.matcher import match_issue_labels
from app.core.mailer import send_issue_alert_email



def _rand_id(length: int = 5) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ts() -> int:
    return int(time.time() * 1000)


async def scan_all_subscriptions(
    override_subscriptions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Scan all active subscriptions for new matching issues."""
    if override_subscriptions and len(override_subscriptions) > 0:
        subscriptions = [s for s in override_subscriptions if s.get("isActive", True)]
    else:
        subscriptions = [s for s in database.get_subscriptions() if s.get("isActive", True)]

    settings = database.get_settings()
    report: dict[str, Any] = {
        "timestamp": _now_iso(),
        "totalSubscriptionsChecked": len(subscriptions),
        "totalNewIssuesEvaluated": 0,
        "totalMatchesFound": 0,
        "newDetectedIssues": [],
    }

    for sub in subscriptions:
        try:
            # Advance the GitHub query window after every successful scan.  Using
            # ``createdAt`` here forever made each scan re-read the entire
            # subscription lifetime and, because only the newest GitHub page is
            # returned, could leave a repository looking like it was not being
            # tracked at all.
            since_time = sub.get("lastCheckedAt") or sub.get("createdAt") or _now_iso()
            issues = await get_recent_issues(
                sub.get("repoOwner", ""),
                sub.get("repoName", ""),
                since_time,
                settings.get("githubToken", ""),
            )

            for issue in issues:
                # ``since`` on GitHub's issues API is based on updates rather
                # than creation.  Keep the monitoring window strict locally.
                issue_created = issue.get("created_at", "")
                scan_started = sub.get("lastCheckedAt") or sub.get("createdAt", "")
                if issue_created and scan_started:
                    try:
                        if datetime.fromisoformat(issue_created.replace("Z", "+00:00")) < datetime.fromisoformat(scan_started.replace("Z", "+00:00")):
                            continue
                    except (ValueError, TypeError):
                        pass

                report["totalNewIssuesEvaluated"] += 1
                repo_full = sub.get("repoFullName", "")
                issue_num = issue.get("number", 0)

                if database.has_seen_issue(repo_full, issue_num):
                    continue

                match_result = match_issue_labels(
                    issue.get("labels", []),
                    sub.get("trackedLabels", []),
                    sub.get("matchMode", "any"),
                )

                if match_result["isMatch"]:
                    detected: dict[str, Any] = {
                        "id": f"issue_{_ts()}_{issue_num}",
                        "subscriptionId": sub.get("id", ""),
                        "repoFullName": repo_full,
                        "issueNumber": issue_num,
                        "issueTitle": issue.get("title", ""),
                        "issueBody": issue.get("body", ""),
                        "issueUrl": issue.get("html_url", ""),
                        "authorLogin": issue.get("user", {}).get("login", "unknown"),
                        "authorAvatar": issue.get("user", {}).get("avatar_url", ""),
                        "labels": issue.get("labels", []),
                        "matchedLabels": match_result["matchedLabels"],
                        "createdAt": issue_created,
                        "detectedAt": _now_iso(),
                        "isRead": False,
                    }

                    database.add_detected_issue(detected)
                    report["totalMatchesFound"] += 1
                    report["newDetectedIssues"].append(detected)

                    notif: dict[str, Any] = {
                        "id": f"notif_{_ts()}_{_rand_id(4)}",
                        "issueId": detected["id"],
                        "subscriptionId": sub.get("id", ""),
                        "repoFullName": repo_full,
                        "issueNumber": issue_num,
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
                    database.add_notification(notif)

                    if settings.get("emailEnabled", True):
                        try:
                            await send_issue_alert_email(detected, sub)
                        except Exception:
                            pass

            database.update_subscription(sub.get("id", ""), {"lastCheckedAt": _now_iso()})
        except Exception:
            pass

    return report


async def scan_single_subscription(sub_id: str) -> list[dict[str, Any]]:
    """Scan a single subscription and return newly matched issues."""
    sub = database.get_subscription(sub_id)
    if not sub:
        return []

    settings = database.get_settings()
    since_time = sub.get("lastCheckedAt") or sub.get("createdAt") or _now_iso()
    issues = await get_recent_issues(
        sub.get("repoOwner", ""),
        sub.get("repoName", ""),
        since_time,
        settings.get("githubToken", ""),
    )

    newly_matched: list[dict[str, Any]] = []

    for issue in issues:
        issue_created = issue.get("created_at", "")
        scan_started = sub.get("lastCheckedAt") or sub.get("createdAt", "")
        if issue_created and scan_started:
            try:
                if datetime.fromisoformat(issue_created.replace("Z", "+00:00")) < datetime.fromisoformat(scan_started.replace("Z", "+00:00")):
                    continue
            except (ValueError, TypeError):
                pass

        repo_full = sub.get("repoFullName", "")
        issue_num = issue.get("number", 0)

        if database.has_seen_issue(repo_full, issue_num):
            continue

        match_result = match_issue_labels(
            issue.get("labels", []),
            sub.get("trackedLabels", []),
            sub.get("matchMode", "any"),
        )

        if match_result["isMatch"]:
            detected: dict[str, Any] = {
                "id": f"issue_{_ts()}_{issue_num}",
                "subscriptionId": sub.get("id", ""),
                "repoFullName": repo_full,
                "issueNumber": issue_num,
                "issueTitle": issue.get("title", ""),
                "issueBody": issue.get("body", ""),
                "issueUrl": issue.get("html_url", ""),
                "authorLogin": issue.get("user", {}).get("login", "unknown"),
                "authorAvatar": issue.get("user", {}).get("avatar_url", ""),
                "labels": issue.get("labels", []),
                "matchedLabels": match_result["matchedLabels"],
                "createdAt": issue_created,
                "detectedAt": _now_iso(),
                "isRead": False,
            }

            database.add_detected_issue(detected)
            newly_matched.append(detected)

            notif: dict[str, Any] = {
                "id": f"notif_{_ts()}_{_rand_id(4)}",
                "issueId": detected["id"],
                "subscriptionId": sub.get("id", ""),
                "repoFullName": repo_full,
                "issueNumber": issue_num,
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
            database.add_notification(notif)

            if settings.get("emailEnabled", True):
                try:
                    await send_issue_alert_email(detected, sub)
                except Exception:
                    pass

    database.update_subscription(sub.get("id", ""), {"lastCheckedAt": _now_iso()})
    return newly_matched
