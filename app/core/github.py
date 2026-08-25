"""
Async GitHub API client using httpx
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

import httpx

from app.core.constants import CURATED_REPOSITORIES
from app.core import db as database
from app.config import get_settings

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"


def _get_auth_headers(override_token: str = "") -> dict[str, str]:
    """Build headers, injecting Bearer token if available."""
    token = override_token
    if not token:
        db_settings = database.get_settings()
        token = db_settings.get("githubToken", "")
    if not token:
        token = get_settings().github_token

    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GitPing/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _curated_fallback(query: str) -> list[dict[str, Any]]:
    """Filter curated repos matching the query as a fallback when rate-limited."""
    q = query.lower()
    results: list[dict[str, Any]] = []
    for i, r in enumerate(CURATED_REPOSITORIES):
        if (
            q in r["fullName"].lower()
            or q in r["title"].lower()
            or (r.get("language") and q in r["language"].lower())
        ):
            results.append(
                {
                    "id": 1000 + i,
                    "full_name": r["fullName"],
                    "name": r["repo"],
                    "owner": {
                        "login": r["owner"],
                        "avatar_url": r["avatar"],
                        "html_url": f"https://github.com/{r['owner']}",
                    },
                    "description": r["description"],
                    "stargazers_count": r["stars"],
                    "forks_count": round(r["stars"] * 0.2),
                    "open_issues_count": 140,
                    "language": r["language"],
                    "topics": ["open-source", r["language"].lower()],
                    "html_url": f"https://github.com/{r['fullName']}",
                    "updated_at": "",
                }
            )
    return results


FALLBACK_LABELS: list[dict[str, Any]] = [
    {"name": "good first issue", "color": "7057ff", "description": "Good for newcomers"},
    {"name": "help wanted", "color": "008672", "description": "Extra attention is needed"},
    {"name": "Documentation", "color": "0075ca", "description": "Improvements or additions to documentation"},
    {"name": "bug", "color": "d73a4a", "description": "Something isn't working"},
    {"name": "enhancement", "color": "a2eeef", "description": "New feature or request"},
    {"name": "duplicate", "color": "cfd3d7", "description": "This issue or pull request already exists"},
    {"name": "invalid", "color": "e4e669", "description": "This doesn't seem right"},
    {"name": "question", "color": "d876e3", "description": "Further information is requested"},
    {"name": "wontfix", "color": "ffffff", "description": "This will not be worked on"},
    {"name": "needs reproduction", "color": "fbca04", "description": "Needs reproduction steps or minimal repo"},
    {"name": "difficulty: easy", "color": "c2e0c6", "description": "Estimated time: 1-2 hours"},
    {"name": "difficulty: medium", "color": "fef2c0", "description": "Estimated time: 1 day"},
]



async def search_repositories(query: str, token: str = "") -> list[dict[str, Any]]:
    """Search GitHub repos. Falls back to curated list on error."""
    if not query or not query.strip():
        return []
    clean = query.strip()

    # Try direct owner/repo lookup first
    if "/" in clean and " " not in clean:
        parts = clean.replace("https://github.com/", "").split("/")
        if len(parts) >= 2 and parts[0] and parts[1]:
            try:
                direct = await get_repo_details(parts[0], parts[1], token)
                if direct:
                    return [direct]
            except Exception:
                pass

    url = f"{GITHUB_API_BASE}/search/repositories?q={quote(clean)}&sort=stars&order=desc&per_page=10"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=_get_auth_headers(token))
            if res.status_code != 200:
                logger.warning("GitHub search API %d: %s", res.status_code, res.text[:200])
                return _curated_fallback(clean)
            data = res.json()
            return [_map_repo(item) for item in (data.get("items") or [])]
    except Exception as exc:
        logger.error("GitHub search failed: %s", exc)
        return _curated_fallback(clean)


async def get_repo_details(owner: str, repo: str, token: str = "") -> dict[str, Any] | None:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=_get_auth_headers(token))
            if res.status_code != 200:
                # Check curated fallback
                for r in CURATED_REPOSITORIES:
                    if r["owner"].lower() == owner.lower() and r["repo"].lower() == repo.lower():
                        return {
                            "id": 1001,
                            "full_name": r["fullName"],
                            "name": r["repo"],
                            "owner": {"login": r["owner"], "avatar_url": r["avatar"]},
                            "description": r["description"],
                            "stargazers_count": r["stars"],
                            "forks_count": round(r["stars"] * 0.2),
                            "open_issues_count": 142,
                            "language": r["language"],
                            "topics": ["open-source"],
                            "html_url": f"https://github.com/{r['fullName']}",
                            "updated_at": "",
                        }
                return None
            return _map_repo(res.json())
    except Exception as exc:
        logger.error("Failed to get repo %s/%s: %s", owner, repo, exc)
        return None


async def get_repo_labels(owner: str, repo: str, token: str = "") -> list[dict[str, Any]]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/labels?per_page=100"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=_get_auth_headers(token))
            if res.status_code != 200:
                logger.warning("Labels API %d for %s/%s", res.status_code, owner, repo)
                return FALLBACK_LABELS
            data = res.json()
            if not isinstance(data, list):
                return FALLBACK_LABELS
            return [
                {
                    "id": l.get("id"),
                    "name": l["name"],
                    "color": l.get("color", "cccccc").lstrip("#"),
                    "description": l.get("description", ""),
                    "default": l.get("default", False),
                }
                for l in data
            ]
    except Exception as exc:
        logger.error("Failed to fetch labels for %s/%s: %s", owner, repo, exc)
        return FALLBACK_LABELS


async def get_recent_issues(
    owner: str,
    repo: str,
    since_iso: str = "",
    token: str = "",
) -> list[dict[str, Any]]:
    """Fetch recent open issues, filtering out pull requests."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues?state=open&sort=created&direction=desc&per_page=15"
    if since_iso:
        url += f"&since={quote(since_iso)}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=_get_auth_headers(token))
            if res.status_code != 200:
                logger.warning("Issues API %d for %s/%s", res.status_code, owner, repo)
                return []
            data = res.json()
            if not isinstance(data, list):
                return []
            # Filter out pull requests
            return [_map_issue(item) for item in data if "pull_request" not in item]
    except Exception as exc:
        logger.error("Failed to fetch issues for %s/%s: %s", owner, repo, exc)
        return []



def _map_repo(item: dict) -> dict[str, Any]:
    return {
        "id": item.get("id", 0),
        "full_name": item.get("full_name", ""),
        "name": item.get("name", ""),
        "owner": {
            "login": (item.get("owner") or {}).get("login", ""),
            "avatar_url": (item.get("owner") or {}).get("avatar_url", ""),
            "html_url": (item.get("owner") or {}).get("html_url"),
        },
        "description": item.get("description"),
        "stargazers_count": item.get("stargazers_count", 0),
        "forks_count": item.get("forks_count", 0),
        "open_issues_count": item.get("open_issues_count", 0),
        "language": item.get("language"),
        "topics": item.get("topics", []),
        "html_url": item.get("html_url", ""),
        "updated_at": item.get("updated_at", ""),
    }


def _map_issue(item: dict) -> dict[str, Any]:
    return {
        "id": item.get("id", 0),
        "number": item.get("number", 0),
        "title": item.get("title", ""),
        "body": item.get("body", ""),
        "state": item.get("state", "open"),
        "html_url": item.get("html_url", ""),
        "user": {
            "login": (item.get("user") or {}).get("login", "unknown"),
            "avatar_url": (item.get("user") or {}).get(
                "avatar_url", "https://avatars.githubusercontent.com/u/0"
            ),
            "html_url": (item.get("user") or {}).get("html_url"),
        },
        "labels": [
            {
                "id": l.get("id"),
                "name": l.get("name", ""),
                "color": (l.get("color") or "cccccc").lstrip("#"),
                "description": l.get("description", ""),
            }
            for l in (item.get("labels") or [])
        ],
        "created_at": item.get("created_at", ""),
        "updated_at": item.get("updated_at", ""),
        "repository_url": item.get("repository_url"),
    }
