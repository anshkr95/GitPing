import fs from 'fs';
import path from 'path';
import os from 'os';
import { Subscription, DetectedIssue, NotificationItem, UserSettings } from './types';

interface DatabaseSchema {
  subscriptions: Subscription[];
  detectedIssues: DetectedIssue[];
  notifications: NotificationItem[];
  settings: UserSettings;
  seenIssueIds: string[];
}

function getDbDir(): string {
  // Use /tmp in production/serverless to avoid read-only filesystem errors
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return path.join(os.tmpdir(), 'gitping-data');
  }
  return path.join(process.cwd(), '.data');
}

const DB_DIR = getDbDir();
const DB_FILE = path.join(DB_DIR, 'radar-db.json');

const DEFAULT_SETTINGS: UserSettings = {
  email: '',
  emailEnabled: true,
  soundEnabled: true,
  browserNotifyEnabled: true,
  pollingIntervalSeconds: 60,
  githubToken: '',
  welcomeEmailSent: false,
};

function buildDefaultSettings(): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    email: process.env.GITPING_ALERT_EMAIL || DEFAULT_SETTINGS.email,
    githubToken: process.env.GITHUB_TOKEN || DEFAULT_SETTINGS.githubToken,
  };
}

function ensureDirectory() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

function readFromDisk(): DatabaseSchema {
  ensureDirectory();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        detectedIssues: Array.isArray(parsed.detectedIssues) ? parsed.detectedIssues : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        settings: { ...buildDefaultSettings(), ...(parsed.settings || {}) },
        seenIssueIds: Array.isArray(parsed.seenIssueIds) ? parsed.seenIssueIds : [],
      };
    }
  } catch {
    // fall through to default
  }
  return {
    subscriptions: [],
    detectedIssues: [],
    notifications: [],
    settings: buildDefaultSettings(),
    seenIssueIds: [],
  };
}

function writeToDisk(data: DatabaseSchema) {
  ensureDirectory();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

class Database {
  public getSubscriptions(): Subscription[] {
    return readFromDisk().subscriptions;
  }

  public getSubscription(id: string): Subscription | undefined {
    return readFromDisk().subscriptions.find((s) => s.id === id);
  }

  public getSubscriptionByRepo(repoFullName: string): Subscription | undefined {
    return readFromDisk().subscriptions.find(
      (s) => s.repoFullName.toLowerCase() === repoFullName.toLowerCase()
    );
  }

  public addSubscription(sub: Omit<Subscription, 'id' | 'createdAt' | 'lastCheckedAt' | 'matchedCount'>): Subscription {
    const data = readFromDisk();
    const existing = data.subscriptions.find(
      (s) => s.repoFullName.toLowerCase() === sub.repoFullName.toLowerCase()
    );

    if (existing) {
      existing.trackedLabels = sub.trackedLabels;
      existing.matchMode = sub.matchMode;
      existing.isActive = sub.isActive !== undefined ? sub.isActive : true;
      writeToDisk(data);
      return existing;
    }

    const newSub: Subscription = {
      ...sub,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      matchedCount: 0,
      isActive: sub.isActive !== undefined ? sub.isActive : true,
    };
    data.subscriptions.unshift(newSub);
    writeToDisk(data);
    return newSub;
  }

  public updateSubscription(id: string, updates: Partial<Subscription>): Subscription | null {
    const data = readFromDisk();
    const index = data.subscriptions.findIndex((s) => s.id === id);
    if (index === -1) return null;
    data.subscriptions[index] = { ...data.subscriptions[index], ...updates };
    writeToDisk(data);
    return data.subscriptions[index];
  }

  public deleteSubscription(id: string): boolean {
    const data = readFromDisk();
    const prevLen = data.subscriptions.length;
    data.subscriptions = data.subscriptions.filter((s) => s.id !== id);
    if (data.subscriptions.length !== prevLen) {
      writeToDisk(data);
      return true;
    }
    return false;
  }

  public getDetectedIssues(limit = 50): DetectedIssue[] {
    return readFromDisk().detectedIssues.slice(0, limit);
  }

  public addDetectedIssue(issue: DetectedIssue): void {
    const data = readFromDisk();
    const key = `${issue.repoFullName}#${issue.issueNumber}`;
    if (!data.seenIssueIds.includes(key)) {
      data.seenIssueIds.push(key);
    }
    data.detectedIssues.unshift(issue);
    if (data.detectedIssues.length > 200) {
      data.detectedIssues = data.detectedIssues.slice(0, 200);
    }
    const sub = data.subscriptions.find(
      (s) => s.id === issue.subscriptionId || s.repoFullName.toLowerCase() === issue.repoFullName.toLowerCase()
    );
    if (sub) {
      sub.matchedCount = (sub.matchedCount || 0) + 1;
    }
    writeToDisk(data);
  }

  public hasSeenIssue(repoFullName: string, issueNumber: number): boolean {
    const key = `${repoFullName}#${issueNumber}`;
    return readFromDisk().seenIssueIds.includes(key);
  }

  public markIssueRead(id: string): boolean {
    const data = readFromDisk();
    const issue = data.detectedIssues.find((i) => i.id === id);
    if (issue) {
      issue.isRead = true;
      writeToDisk(data);
      return true;
    }
    return false;
  }

  public getNotifications(limit = 30): NotificationItem[] {
    return readFromDisk().notifications.slice(0, limit);
  }

  public addNotification(notification: NotificationItem): void {
    const data = readFromDisk();
    data.notifications.unshift(notification);
    if (data.notifications.length > 100) {
      data.notifications = data.notifications.slice(0, 100);
    }
    writeToDisk(data);
  }

  public markNotificationRead(id: string): boolean {
    const data = readFromDisk();
    const notif = data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      writeToDisk(data);
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(): void {
    const data = readFromDisk();
    data.notifications.forEach((n) => (n.isRead = true));
    data.detectedIssues.forEach((i) => (i.isRead = true));
    writeToDisk(data);
  }

  public clearNotifications(): void {
    const data = readFromDisk();
    data.notifications = [];
    writeToDisk(data);
  }

  public getSettings(): UserSettings {
    const data = readFromDisk();
    const envEmail = process.env.GITPING_ALERT_EMAIL;
    if (envEmail && !data.settings.email) {
      data.settings.email = envEmail;
    }
    if (process.env.GITHUB_TOKEN && !data.settings.githubToken) {
      data.settings.githubToken = process.env.GITHUB_TOKEN;
    }
    return data.settings;
  }

  public updateSettings(updates: Partial<UserSettings>): UserSettings {
    const data = readFromDisk();
    data.settings = { ...data.settings, ...updates };
    writeToDisk(data);
    return data.settings;
  }
}

export const db = new Database();
