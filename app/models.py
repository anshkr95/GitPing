"""
Pydantic models / schemas
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


class GitHubOwner(BaseModel):
    login: str = ""
    avatar_url: str = ""
    html_url: Optional[str] = None


class GitHubRepo(BaseModel):
    id: int
    full_name: str
    name: str
    owner: GitHubOwner
    description: Optional[str] = None
    stargazers_count: int = 0
    forks_count: int = 0
    open_issues_count: int = 0
    language: Optional[str] = None
    topics: list[str] = Field(default_factory=list)
    html_url: str
    updated_at: str = ""


class GitHubLabel(BaseModel):
    id: Optional[int] = None
    name: str
    color: str  # hex without #
    description: Optional[str] = None
    default: Optional[bool] = None


class GitHubIssue(BaseModel):
    id: int
    number: int
    title: str
    body: Optional[str] = None
    state: Literal["open", "closed"]
    html_url: str
    user: GitHubOwner
    labels: list[GitHubLabel] = Field(default_factory=list)
    created_at: str
    updated_at: str
    repository_url: Optional[str] = None


class Subscription(BaseModel):
    id: str = ""
    repo_full_name: str = Field(alias="repoFullName", default="")
    repo_owner: str = Field(alias="repoOwner", default="")
    repo_name: str = Field(alias="repoName", default="")
    repo_url: str = Field(alias="repoUrl", default="")
    repo_avatar: Optional[str] = Field(alias="repoAvatar", default=None)
    repo_stars: Optional[int] = Field(alias="repoStars", default=None)
    repo_description: Optional[str] = Field(alias="repoDescription", default=None)
    repo_language: Optional[str] = Field(alias="repoLanguage", default=None)
    tracked_labels: list[str] = Field(alias="trackedLabels", default_factory=list)
    match_mode: Literal["any", "all"] = Field(alias="matchMode", default="any")
    is_active: bool = Field(alias="isActive", default=True)
    created_at: str = Field(alias="createdAt", default="")
    last_checked_at: str = Field(alias="lastCheckedAt", default="")
    matched_count: int = Field(alias="matchedCount", default=0)

    model_config = {"populate_by_name": True}


class DetectedIssue(BaseModel):
    id: str = ""
    subscription_id: str = Field(alias="subscriptionId", default="")
    repo_full_name: str = Field(alias="repoFullName", default="")
    issue_number: int = Field(alias="issueNumber", default=0)
    issue_title: str = Field(alias="issueTitle", default="")
    issue_body: Optional[str] = Field(alias="issueBody", default=None)
    issue_url: str = Field(alias="issueUrl", default="")
    author_login: str = Field(alias="authorLogin", default="")
    author_avatar: str = Field(alias="authorAvatar", default="")
    labels: list[GitHubLabel] = Field(default_factory=list)
    matched_labels: list[str] = Field(alias="matchedLabels", default_factory=list)
    created_at: str = Field(alias="createdAt", default="")
    detected_at: str = Field(alias="detectedAt", default="")
    is_read: bool = Field(alias="isRead", default=False)

    model_config = {"populate_by_name": True}


class NotificationItem(BaseModel):
    id: str = ""
    issue_id: Optional[str] = Field(alias="issueId", default=None)
    subscription_id: Optional[str] = Field(alias="subscriptionId", default=None)
    repo_full_name: str = Field(alias="repoFullName", default="")
    issue_number: int = Field(alias="issueNumber", default=0)
    issue_title: str = Field(alias="issueTitle", default="")
    issue_url: str = Field(alias="issueUrl", default="")
    matched_labels: list[str] = Field(alias="matchedLabels", default_factory=list)
    created_at: str = Field(alias="createdAt", default="")
    is_read: bool = Field(alias="isRead", default=False)
    channels: NotificationChannels = Field(default_factory=lambda: NotificationChannels())
    email_sent_to: Optional[str] = Field(alias="emailSentTo", default=None)

    model_config = {"populate_by_name": True}


class NotificationChannels(BaseModel):
    in_app: bool = Field(alias="inApp", default=True)
    browser: bool = True
    email: bool = True

    model_config = {"populate_by_name": True}


class UserSettings(BaseModel):
    email: str = ""
    email_enabled: bool = Field(alias="emailEnabled", default=True)
    sound_enabled: bool = Field(alias="soundEnabled", default=True)
    browser_notify_enabled: bool = Field(alias="browserNotifyEnabled", default=True)
    polling_interval_seconds: int = Field(alias="pollingIntervalSeconds", default=60)
    github_token: str = Field(alias="githubToken", default="")
    welcome_email_sent: bool = Field(alias="welcomeEmailSent", default=False)

    model_config = {"populate_by_name": True}


class MatchResult(BaseModel):
    is_match: bool = Field(alias="isMatch", default=False)
    matched_labels: list[str] = Field(alias="matchedLabels", default_factory=list)
    total_tracked: int = Field(alias="totalTracked", default=0)
    total_matched: int = Field(alias="totalMatched", default=0)
    match_mode: Literal["any", "all"] = Field(alias="matchMode", default="any")
    reason: str = ""

    model_config = {"populate_by_name": True}


class ScanReport(BaseModel):
    timestamp: str = ""
    total_subscriptions_checked: int = Field(alias="totalSubscriptionsChecked", default=0)
    total_new_issues_evaluated: int = Field(alias="totalNewIssuesEvaluated", default=0)
    total_matches_found: int = Field(alias="totalMatchesFound", default=0)
    new_detected_issues: list[DetectedIssue] = Field(
        alias="newDetectedIssues", default_factory=list
    )

    model_config = {"populate_by_name": True}
