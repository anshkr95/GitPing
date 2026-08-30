import nodemailer from 'nodemailer';
import { DetectedIssue, Subscription } from './types';
import { db } from './db';

// creates nodemailer transporter using env SMTP config
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// resolves From header
function fromAddress(): string {
  return process.env.SMTP_FROM || `"GitPing" <${process.env.SMTP_USER}>`;
}

// HTML template for issue alerts
function buildIssueAlertHtml(issue: DetectedIssue, sub?: Subscription): string {
  const labelPills = issue.labels
    .map(
      (l) =>
        `<span style="display:inline-block;padding:2px 8px;font-size:12px;font-weight:600;color:#ffffff;background-color:#${l.color};border-radius:12px;margin:2px 4px 2px 0;">${l.name}</span>`
    )
    .join('');

  const matchedPills = issue.matchedLabels
    .map((l) => `<code style="background:#21262d;padding:2px 6px;border-radius:4px;font-size:12px;color:#e6edf3;">${l}</code>`)
    .join(' ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e6edf3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background-color:#161b22;border:1px solid #30363d;border-radius:6px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #30363d;">
              <span style="font-size:14px;font-weight:600;color:#e6edf3;">GitPing</span>
              <span style="font-size:12px;color:#8b949e;margin-left:8px;">New matching issue</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:20px;">
              <div style="font-size:12px;color:#8b949e;margin-bottom:8px;">
                ${issue.repoFullName} #${issue.issueNumber}
              </div>

              <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;line-height:1.4;">
                <a href="${issue.issueUrl}" style="color:#58a6ff;text-decoration:none;">${issue.issueTitle}</a>
              </h2>

              <div style="margin-bottom:12px;">
                ${labelPills}
              </div>

              <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px 14px;margin-bottom:16px;">
                <div style="font-size:11px;color:#3fb950;font-weight:600;margin-bottom:4px;">MATCHED LABELS</div>
                <div>${matchedPills}</div>
              </div>

              ${issue.issueBody ? `
              <div style="font-size:13px;color:#8b949e;line-height:1.5;margin-bottom:16px;max-height:120px;overflow:hidden;">
                ${issue.issueBody.substring(0, 200)}${issue.issueBody.length > 200 ? '...' : ''}
              </div>
              ` : ''}

              <div style="font-size:12px;color:#6e7681;margin-bottom:16px;">
                by @${issue.authorLogin} · ${new Date(issue.createdAt).toLocaleString()}
              </div>

              <a href="${issue.issueUrl}" style="display:inline-block;padding:8px 16px;background:#238636;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;border-radius:6px;">
                View on GitHub
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:12px 20px;border-top:1px solid #30363d;font-size:11px;color:#6e7681;">
              Monitoring ${issue.repoFullName} · Labels: ${sub ? sub.trackedLabels.join(', ') : issue.matchedLabels.join(', ')}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// sends alert email for matching issue
export async function sendIssueAlertEmail(
  issue: DetectedIssue,
  sub?: Subscription
): Promise<void> {
  const settings = db.getSettings();
  const recipient = settings.email || process.env.GITPING_ALERT_EMAIL || '';

  if (!recipient || !settings.emailEnabled) {
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    return;
  }

  const html = buildIssueAlertHtml(issue, sub);
  const subject = `[GitPing] ${issue.repoFullName} #${issue.issueNumber}: ${issue.issueTitle}`;

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: recipient,
      subject,
      html,
    });
  } catch {}
}

// HTML template for welcome email
function buildWelcomeHtml(recipient: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e6edf3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background-color:#161b22;border:1px solid #30363d;border-radius:6px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #30363d;">
              <span style="font-size:14px;font-weight:600;color:#e6edf3;">GitPing</span>
              <span style="font-size:12px;color:#8b949e;margin-left:8px;">Welcome</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px 20px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:#f0f6fc;">You're all set 🎉</h1>
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
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:12px 20px;border-top:1px solid #30363d;font-size:11px;color:#6e7681;">
              This message was sent to ${recipient} because email alerts were enabled in GitPing.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// sends welcome email, returns success status and any error message
export async function sendWelcomeEmail(recipient: string): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter();
  if (!transporter) {
    const msg = 'SMTP not configured. Please set SMTP_USER and SMTP_PASS environment variables.';
    return { success: false, error: msg };
  }

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: recipient,
      subject: 'Welcome to GitPing - email alerts are on',
      html: buildWelcomeHtml(recipient),
    });
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return { success: false, error: errorMsg };
  }
}
