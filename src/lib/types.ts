export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url?: string;
  };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  html_url: string;
  updated_at: string;
}

export interface GitHubLabel {
  id?: number;
  name: string;
  color: string; // hex without #
  description?: string | null;
  default?: boolean;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
    html_url?: string;
  };
  labels: GitHubLabel[];
  created_at: string;
  updated_at: string;
  repository_url?: string;
}

export interface Subscription {
  id: string;
  repoFullName: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  repoAvatar?: string;
  repoStars?: number;
  repoDescription?: string;
  repoLanguage?: string;
  trackedLabels: string[];
  matchMode: 'any' | 'all';
  isActive: boolean;
  createdAt: string;
  lastCheckedAt: string;
  matchedCount: number;
}

export interface DetectedIssue {
  id: string;
  subscriptionId: string;
  repoFullName: string;
  issueNumber: number;
  issueTitle: string;
  issueBody?: string;
  issueUrl: string;
  authorLogin: string;
  authorAvatar: string;
  labels: GitHubLabel[];
  matchedLabels: string[];
  createdAt: string;
  detectedAt: string;
  isRead: boolean;
}

export interface NotificationItem {
  id: string;
  issueId?: string;
  subscriptionId?: string;
  repoFullName: string;
  issueNumber: number;
  issueTitle: string;
  issueUrl: string;
  matchedLabels: string[];
  createdAt: string;
  isRead: boolean;
  channels: {
    inApp: boolean;
    browser: boolean;
    email: boolean;
  };
  emailSentTo?: string;
}

export interface UserProfile {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
  isLoggedIn: boolean;
  isOnboarded: boolean;
}

export interface UserSettings {
  email: string;
  emailEnabled: boolean;
  soundEnabled: boolean;
  browserNotifyEnabled: boolean;
  pollingIntervalSeconds: number;
  githubToken: string;
  welcomeEmailSent: boolean;
}

export interface MatchResult {
  isMatch: boolean;
  matchedLabels: string[];
  totalTracked: number;
  totalMatched: number;
  matchMode: 'any' | 'all';
  reason: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}
