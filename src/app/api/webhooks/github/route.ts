import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchIssueLabels } from '@/lib/matcher';
import { sendIssueAlertEmail } from '@/lib/mailer';
import { DetectedIssue, NotificationItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = request.headers.get('x-github-event') || 'issues';

    // Only process opened and labeled events
    const action = payload.action;
    const issue = payload.issue;
    const repository = payload.repository;

    if (!issue || !repository) {
      return NextResponse.json({ message: 'Ignored: No issue or repository payload' }, { status: 200 });
    }

    if (action !== 'opened' && action !== 'labeled') {
      return NextResponse.json({ message: `Ignored action: ${action}` }, { status: 200 });
    }

    const repoFullName = repository.full_name;
    const sub = db.getSubscriptionByRepo(repoFullName);

    if (!sub || !sub.isActive) {
      return NextResponse.json({ message: `Repository ${repoFullName} is not actively tracked` }, { status: 200 });
    }

    if (db.hasSeenIssue(repoFullName, issue.number)) {
      return NextResponse.json({ message: 'Issue already processed' }, { status: 200 });
    }

    const rawLabels = issue.labels || [];
    const matchResult = matchIssueLabels(rawLabels, sub.trackedLabels, sub.matchMode);

    if (!matchResult.isMatch) {
      return NextResponse.json({
        matched: false,
        reason: matchResult.reason,
      });
    }

    const detected: DetectedIssue = {
      id: `issue_${Date.now()}_${issue.number}`,
      subscriptionId: sub.id,
      repoFullName: sub.repoFullName,
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueBody: issue.body || '',
      issueUrl: issue.html_url,
      authorLogin: issue.user?.login || 'unknown',
      authorAvatar: issue.user?.avatar_url || 'https://avatars.githubusercontent.com/u/0',
      labels: rawLabels.map((l: any) => ({
        name: l.name,
        color: (l.color || 'cccccc').replace(/^#/, ''),
        description: l.description || '',
      })),
      matchedLabels: matchResult.matchedLabels,
      createdAt: issue.created_at || new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      isRead: false,
    };

    db.addDetectedIssue(detected);

    const settings = db.getSettings();
    const notif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      issueId: detected.id,
      subscriptionId: sub.id,
      repoFullName: sub.repoFullName,
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueUrl: issue.html_url,
      matchedLabels: matchResult.matchedLabels,
      createdAt: new Date().toISOString(),
      isRead: false,
      channels: {
        inApp: true,
        browser: settings.browserNotifyEnabled,
        email: settings.emailEnabled,
      },
      emailSentTo: settings.emailEnabled ? settings.email : undefined,
    };
    db.addNotification(notif);

    if (settings.emailEnabled) {
      await sendIssueAlertEmail(detected, sub);
    }

    return NextResponse.json({
      matched: true,
      issueNumber: issue.number,
      repo: repoFullName,
      matchedLabels: matchResult.matchedLabels,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
