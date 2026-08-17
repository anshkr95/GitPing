import { db } from './db';
import { getRecentIssues } from './github';
import { matchIssueLabels } from './matcher';
import { sendIssueAlertEmail } from './mailer';
import { DetectedIssue, NotificationItem, Subscription } from './types';

export interface ScanReport {
  timestamp: string;
  totalSubscriptionsChecked: number;
  totalNewIssuesEvaluated: number;
  totalMatchesFound: number;
  newDetectedIssues: DetectedIssue[];
}

// scan active subscriptions for new issues
export async function scanAllSubscriptions(overrideSubscriptions?: Subscription[]): Promise<ScanReport> {
  const subscriptions = (overrideSubscriptions && overrideSubscriptions.length > 0)
    ? overrideSubscriptions.filter((s) => s.isActive)
    : db.getSubscriptions().filter((s) => s.isActive);
  const settings = db.getSettings();
  const report: ScanReport = {
    timestamp: new Date().toISOString(),
    totalSubscriptionsChecked: subscriptions.length,
    totalNewIssuesEvaluated: 0,
    totalMatchesFound: 0,
    newDetectedIssues: [],
  };

  for (const sub of subscriptions) {
    try {
      const sinceTime = sub.createdAt || new Date().toISOString();
      const issues = await getRecentIssues(sub.repoOwner, sub.repoName, sinceTime, settings.githubToken);
      
      for (const issue of issues) {
        // Strictly only process issues created AFTER tracking began
        if (new Date(issue.created_at) < new Date(sub.createdAt)) continue;

        report.totalNewIssuesEvaluated++;
        const alreadySeen = db.hasSeenIssue(sub.repoFullName, issue.number);

        if (!alreadySeen) {
          const matchResult = matchIssueLabels(issue.labels, sub.trackedLabels, sub.matchMode);
          
          if (matchResult.isMatch) {
            const detected: DetectedIssue = {
              id: `issue_${Date.now()}_${issue.number}`,
              subscriptionId: sub.id,
              repoFullName: sub.repoFullName,
              issueNumber: issue.number,
              issueTitle: issue.title,
              issueBody: issue.body || '',
              issueUrl: issue.html_url,
              authorLogin: issue.user.login,
              authorAvatar: issue.user.avatar_url,
              labels: issue.labels,
              matchedLabels: matchResult.matchedLabels,
              createdAt: issue.created_at,
              detectedAt: new Date().toISOString(),
              isRead: false,
            };

            db.addDetectedIssue(detected);
            report.totalMatchesFound++;
            report.newDetectedIssues.push(detected);

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
              try {
                await sendIssueAlertEmail(detected, sub);
              } catch (err) {
                console.error('Email alert dispatch error:', err);
              }
            }
          }
        }
      }

      db.updateSubscription(sub.id, { lastCheckedAt: new Date().toISOString() });
    } catch (err) {
      console.error(`Error scanning repository ${sub.repoFullName}:`, err);
    }
  }

  return report;
}

// scan a single subscription
export async function scanSingleSubscription(subId: string): Promise<DetectedIssue[]> {
  const sub = db.getSubscription(subId);
  if (!sub) return [];

  const settings = db.getSettings();
  const sinceTime = sub.createdAt || new Date().toISOString();
  const issues = await getRecentIssues(sub.repoOwner, sub.repoName, sinceTime, settings.githubToken);
  const newlyMatched: DetectedIssue[] = [];

  for (const issue of issues) {
    if (new Date(issue.created_at) < new Date(sub.createdAt)) continue;

    const alreadySeen = db.hasSeenIssue(sub.repoFullName, issue.number);
    if (!alreadySeen) {
      const matchResult = matchIssueLabels(issue.labels, sub.trackedLabels, sub.matchMode);
      if (matchResult.isMatch) {
        const detected: DetectedIssue = {
          id: `issue_${Date.now()}_${issue.number}`,
          subscriptionId: sub.id,
          repoFullName: sub.repoFullName,
          issueNumber: issue.number,
          issueTitle: issue.title,
          issueBody: issue.body || '',
          issueUrl: issue.html_url,
          authorLogin: issue.user.login,
          authorAvatar: issue.user.avatar_url,
          labels: issue.labels,
          matchedLabels: matchResult.matchedLabels,
          createdAt: issue.created_at,
          detectedAt: new Date().toISOString(),
          isRead: false,
        };

        db.addDetectedIssue(detected);
        newlyMatched.push(detected);

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
          try {
            await sendIssueAlertEmail(detected, sub);
          } catch (err) {
            console.error('Email alert dispatch error:', err);
          }
        }
      }
    }
  }

  db.updateSubscription(sub.id, { lastCheckedAt: new Date().toISOString() });
  return newlyMatched;
}

// simulate incoming issue for testing
export async function simulateIncomingIssue(payload: {
  repoFullName: string;
  issueNumber: number;
  issueTitle: string;
  issueBody?: string;
  labels: { name: string; color: string }[];
  authorLogin?: string;
}) {
  const sub = db.getSubscriptionByRepo(payload.repoFullName);
  const settings = db.getSettings();

  const trackedLabels = sub ? sub.trackedLabels : ['good first issue', 'help wanted', 'Documentation'];
  const matchMode = sub ? sub.matchMode : 'any';

  const matchResult = matchIssueLabels(payload.labels, trackedLabels, matchMode);

  let detected: DetectedIssue | null = null;
  let notif: NotificationItem | null = null;

  if (matchResult.isMatch) {
    detected = {
      id: `sim_issue_${Date.now()}_${payload.issueNumber}`,
      subscriptionId: sub ? sub.id : 'sub_custom',
      repoFullName: payload.repoFullName,
      issueNumber: payload.issueNumber,
      issueTitle: payload.issueTitle,
      issueBody: payload.issueBody || 'Simulated test issue body demonstrating automatic label trigger.',
      issueUrl: `https://github.com/${payload.repoFullName}/issues/${payload.issueNumber}`,
      authorLogin: payload.authorLogin || 'test-contributor',
      authorAvatar: 'https://avatars.githubusercontent.com/u/583231',
      labels: payload.labels.map((l) => ({ name: l.name, color: l.color.replace(/^#/, '') })),
      matchedLabels: matchResult.matchedLabels,
      createdAt: new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      isRead: false,
    };

    db.addDetectedIssue(detected);

    notif = {
      id: `sim_notif_${Date.now()}`,
      issueId: detected.id,
      subscriptionId: sub ? sub.id : 'sub_custom',
      repoFullName: payload.repoFullName,
      issueNumber: payload.issueNumber,
      issueTitle: payload.issueTitle,
      issueUrl: detected.issueUrl,
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
  }

  return {
    isMatch: matchResult.isMatch,
    matchResult,
    detectedIssue: detected,
    notification: notif,
    trackedLabels,
    providedLabels: payload.labels.map((l) => l.name),
  };
}
