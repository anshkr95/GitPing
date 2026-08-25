"""
Application configuration via environment variables.
Uses pydantic-settings so .env / .env.local are loaded automatically.
"""

from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed, validated settings pulled from the environment."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # GitHub
    github_token: str = ""

    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = ""

    # Alert recipient fallback
    gitping_alert_email: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def from_address(self) -> str:
        """Resolved From header for outgoing emails."""
        return self.smtp_from or f'"GitPing" <{self.smtp_user}>'

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_pass)


@lru_cache
def get_settings() -> Settings:
    """Cached singleton - call freely, parsed only once."""
    return Settings()
