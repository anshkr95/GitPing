"""Repository search & labels routes"""

import httpx
from fastapi import APIRouter, Query
from typing import Optional
from app.core import db as database
from app.core.github import get_repo_labels
from app.config import get_settings

router = APIRouter(prefix="/api/repos", tags=["repos"])


@router.get("/search")
async def search_repos(
    q: str = Query(""),
    sort: Optional[str] = Query(None),
    order: str = Query("desc"),
    language: Optional[str] = Query(None),
    topics: Optional[str] = Query(None),
    page: int = Query(1),
):
    """Search GitHub repositories with language/topic filters."""
    # Build GitHub search query with qualifiers
    topic_list = [
        t.strip().lower().replace(" ", "-")
        for t in (topics or "").split(",")
        if t.strip()
    ]
    language_list = [l.strip() for l in (language or "").split(",") if l.strip()]

    if not q.strip() and not language_list and not topic_list:
        return {"items": []}

    parts: list[str] = []
    if q.strip():
        parts.append(q.strip())
    for lang in language_list:
        parts.append(f'language:"{lang}"')
    for topic in topic_list:
        parts.append(f"topic:{topic}")

    # Always filter out low-star repos for quality results
    parts.append("stars:>=1000")

    search_query = " ".join(parts)

    url = f"https://api.github.com/search/repositories?q={search_query}&order={order}&per_page=30&page={page}"
    if sort and sort != "best-match":
        url += f"&sort={sort}"

    settings = database.get_settings()
    token = settings.get("githubToken") or get_settings().github_token or ""
    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GitPing/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                return {"items": [], "error": f"GitHub API: {res.status_code}"}
            data = res.json()

        items = [
            {
                "id": item.get("id", 0),
                "full_name": item.get("full_name", ""),
                "name": item.get("name", ""),
                "owner": {
                    "login": (item.get("owner") or {}).get("login", ""),
                    "avatar_url": (item.get("owner") or {}).get("avatar_url", ""),
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
            for item in (data.get("items") or [])
        ]
        total_count = data.get("total_count", 0)
        return {
            "items": items,
            "totalCount": total_count,
            "hasMore": page * 30 < total_count,
            "page": page,
        }
    except Exception as exc:
        return {"items": [], "error": str(exc)}


@router.get("/{owner}/{repo}/labels")
async def repo_labels(owner: str, repo: str):
    """Fetch labels for a repository."""
    labels = await get_repo_labels(owner, repo)
    return {
        "owner": owner,
        "repo": repo,
        "fullName": f"{owner}/{repo}",
        "labels": labels,
        "count": len(labels),
    }
