"""
Async email sender using aiosmtplib
"""

from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import get_settings
from app.core import db as database

logger = logging.getLogger(__name__)



def _build_issue_alert_html(issue: dict, sub: dict | None = None) -> str:
    """GitHub-dark-themed HTML email for issue alerts."""
    repo = issue.get("repoFullName", "")
    number = issue.get("issueNumber", 0)
    title = issue.get("issueTitle", "New Issue")
    body = issue.get("issueBody") or ""
    url = issue.get("issueUrl", "#")
    author = issue.get("authorLogin", "unknown")
    created = issue.get("createdAt", "")
    labels = issue.get("labels", [])
    matched = issue.get("matchedLabels", [])

    label_pills = "".join(
        f'<span style="display:inline-block;padding:2px 8px;font-size:12px;font-weight:600;'
        f'color:#ffffff;background-color:#{l.get("color","888")};border-radius:12px;margin:2px 4px 2px 0;">'
        f'{l.get("name","")}</span>'
        for l in labels
    )

    matched_pills = " ".join(
        f'<code style="background:#21262d;padding:2px 6px;border-radius:4px;font-size:12px;color:#e6edf3;">{m}</code>'
        for m in matched
    )

    body_html = ""
    if body:
        body_preview = body[:200] + ("..." if len(body) > 200 else "")
        body_html = (
            f'<div style="font-size:13px;color:#8b949e;line-height:1.5;margin-bottom:16px;'
            f'max-height:120px;overflow:hidden;">{body_preview}</div>'
        )

    tracked_info = ", ".join(sub["trackedLabels"]) if sub and sub.get("trackedLabels") else ", ".join(matched)

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e6edf3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background-color:#161b22;border:1px solid #30363d;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:16px 20px;border-bottom:1px solid #30363d;">
          <span style="font-size:14px;font-weight:600;color:#e6edf3;">GitPing</span>
          <span style="font-size:12px;color:#8b949e;margin-left:8px;">New matching issue</span>
        </td></tr>
        <tr><td style="padding:20px;">
          <div style="font-size:12px;color:#8b949e;margin-bottom:8px;">{repo} #{number}</div>
          <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;line-height:1.4;">
            <a href="{url}" style="color:#58a6ff;text-decoration:none;">{title}</a>
          </h2>
          <div style="margin-bottom:12px;">{label_pills}</div>
          <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px 14px;margin-bottom:16px;">
            <div style="font-size:11px;color:#3fb950;font-weight:600;margin-bottom:4px;">MATCHED LABELS</div>
            <div>{matched_pills}</div>
          </div>
          {body_html}
          <div style="font-size:12px;color:#6e7681;margin-bottom:16px;">by @{author} · {created}</div>
          <a href="{url}" style="display:inline-block;padding:8px 16px;background:#238636;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;border-radius:6px;">View on GitHub</a>
        </td></tr>
        <tr><td style="padding:12px 20px;border-top:1px solid #30363d;font-size:11px;color:#6e7681;">
          Monitoring {repo} · Labels: {tracked_info}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _build_welcome_html(recipient: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e6edf3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background-color:#161b22;border:1px solid #30363d;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:16px 20px;border-bottom:1px solid #30363d;">
          <span style="font-size:14px;font-weight:600;color:#e6edf3;">GitPing</span>
          <span style="font-size:12px;color:#8b949e;margin-left:8px;">Welcome</span>
        </td></tr>
        <tr><td style="padding:24px 20px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:#f0f6fc;">You're all set </h1>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#c9d1d9;">
            Thanks for setting up GitPing. From now on, <strong style="color:#e6edf3;">you'll receive an email right here</strong>
            whenever a new issue matching your tracked labels is opened on a repository you follow.
          </p>
          <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:14px 16px;margin-bottom:16px;">
            <div style="font-size:11px;color:#3fb950;font-weight:600;margin-bottom:8px;letter-spacing:0.03em;">WHAT HAPPENS NEXT</div>
            <div style="font-size:13px;color:#8b949e;line-height:1.8;">
              1. Search and track a repository from the <strong style="color:#e6edf3;">Tracked</strong> tab.<br/>
              2. Pick the labels you care about - or track every new issue.<br/>
              3. We'll email you the moment a matching issue appears.
            </div>
          </div>
          <p style="margin:0;font-size:12px;color:#6e7681;line-height:1.5;">
            You can turn these notifications off at any time from <strong style="color:#8b949e;">Settings → Alerts</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:12px 20px;border-top:1px solid #30363d;font-size:11px;color:#6e7681;">
          This message was sent to {recipient} because email alerts were enabled in GitPing.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""



async def send_issue_alert_email(issue: dict, sub: dict | None = None) -> None:
    """Send an HTML alert email for a matching issue."""
    cfg = get_settings()
    db_settings = database.get_settings()
    recipient = db_settings.get("email") or cfg.gitping_alert_email or ""

    if not recipient or not db_settings.get("emailEnabled", True):
        logger.info("[Mailer] Email disabled or no recipient for %s#%s", issue.get("repoFullName"), issue.get("issueNumber"))
        return

    if not cfg.smtp_configured:
        logger.info("[Mailer] SMTP not configured - skipping email to %s", recipient)
        return

    html = _build_issue_alert_html(issue, sub)
    subject = f"[GitPing] {issue.get('repoFullName','')} #{issue.get('issueNumber',0)}: {issue.get('issueTitle','')}"

    msg = MIMEMultipart("alternative")
    msg["From"] = cfg.from_address
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=cfg.smtp_host,
            port=cfg.smtp_port,
            username=cfg.smtp_user,
            password=cfg.smtp_pass,
            use_tls=False,
            start_tls=True,
        )
        logger.info("[Mailer] Email sent to %s for %s#%s", recipient, issue.get("repoFullName"), issue.get("issueNumber"))
    except Exception as exc:
        logger.error("[Mailer] Failed to send to %s: %s", recipient, exc)


async def send_welcome_email(recipient: str) -> dict:
    """Send a welcome email."""
    cfg = get_settings()

    if not cfg.smtp_configured:
        msg_text = "SMTP not configured. Please set SMTP_USER and SMTP_PASS environment variables."
        logger.info("[Mailer] %s", msg_text)
        return {"success": False, "error": msg_text}

    html = _build_welcome_html(recipient)
    msg = MIMEMultipart("alternative")
    msg["From"] = cfg.from_address
    msg["To"] = recipient
    msg["Subject"] = "Welcome to GitPing - email alerts are on"
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=cfg.smtp_host,
            port=cfg.smtp_port,
            username=cfg.smtp_user,
            password=cfg.smtp_pass,
            use_tls=False,
            start_tls=True,
        )
        logger.info("[Mailer] Welcome email sent to %s", recipient)
        return {"success": True}
    except Exception as exc:
        error_msg = str(exc)
        logger.error("[Mailer] Welcome email failed for %s: %s", recipient, error_msg)
        return {"success": False, "error": error_msg}
