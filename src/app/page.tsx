'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Bell,
  Settings,
  Flame,
  Layers,
  Search,
  Github,
  BookOpen,
} from 'lucide-react';
import { SetupModal } from '@/components/SetupModal';
import { ResourcesSection } from '@/components/ResourcesSection';
import { RepoSearch } from '@/components/RepoSearch';
import { LabelSelectorModal } from '@/components/LabelSelectorModal';
import { TrackedRepoCard } from '@/components/TrackedRepoCard';
import { LiveIssueFeed } from '@/components/LiveIssueFeed';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { SettingsModal } from '@/components/SettingsModal';
import { ToastContainer } from '@/components/Toast';
import {
  GitHubRepo,
  Subscription,
  DetectedIssue,
  NotificationItem,
  UserSettings,
  ToastMessage,
  ToastType,
} from '@/lib/types';
import { playAlertChime } from '@/lib/audio';

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [settings, setSettings] = useState<UserSettings>({
    email: '',
    emailEnabled: true,
    soundEnabled: true,
    browserNotifyEnabled: true,
    pollingIntervalSeconds: 60,
    githubToken: '',
    welcomeEmailSent: false,
  });

  // Toast system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (title: string, description?: string, type: ToastType = 'info') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Modals
  const [showSetup, setShowSetup] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedRepoForLabels, setSelectedRepoForLabels] = useState<GitHubRepo | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>(undefined);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tab & scan state
  const [activeTab, setActiveTab] = useState<'issues' | 'tracked' | 'resources'>('tracked');
  const [isScanning, setIsScanning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const prevIssueCountRef = useRef(0);
  const hasInitialized = useRef(false);

  // Fetch data
  const fetchAllData = useCallback(async () => {
    try {
      const [subsRes, issuesRes, notifsRes, settingsRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/issues'),
        fetch('/api/notifications'),
        fetch('/api/settings'),
      ]);
      const [subsData, issuesData, notifsData, settingsData] = await Promise.all([
        subsRes.json(), issuesRes.json(), notifsRes.json(), settingsRes.json(),
      ]);

      if (subsData.subscriptions && subsData.subscriptions.length > 0) {
        setSubscriptions(subsData.subscriptions);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gitping_subscriptions', JSON.stringify(subsData.subscriptions));
        }
      } else if (typeof window !== 'undefined') {
        // If server is empty (e.g. serverless cold start), restore from localStorage and sync to server
        const cached = localStorage.getItem('gitping_subscriptions');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSubscriptions(parsed);
              for (const sub of parsed) {
                fetch('/api/subscriptions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sub),
                }).catch(() => {});
              }
            }
          } catch {}
        }
      }

      if (issuesData.issues) {
        setIssues(issuesData.issues);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gitping_issues', JSON.stringify(issuesData.issues));
        }
        if (prevIssueCountRef.current > 0 && issuesData.issues.length > prevIssueCountRef.current && settings.soundEnabled) {
          playAlertChime();
        }
        prevIssueCountRef.current = issuesData.issues.length;
      }

      if (notifsData.notifications) {
        setNotifications(notifsData.notifications);
        setUnreadNotifCount(notifsData.unreadCount || 0);
      }
      if (settingsData.settings) setSettings(settingsData.settings);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [settings.soundEnabled]);

  // Initial load
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Fast-path: read from localStorage immediately so UI never flickers empty
    if (typeof window !== 'undefined') {
      try {
        const cachedSubs = localStorage.getItem('gitping_subscriptions');
        if (cachedSubs) {
          const parsed = JSON.parse(cachedSubs);
          if (Array.isArray(parsed)) setSubscriptions(parsed);
        }
        const cachedIssues = localStorage.getItem('gitping_issues');
        if (cachedIssues) {
          const parsed = JSON.parse(cachedIssues);
          if (Array.isArray(parsed)) setIssues(parsed);
        }
      } catch {}
    }

    fetchAllData().then(() => {
      const stored = localStorage.getItem('gitping_setup_done');
      if (!stored) {
        setShowSetup(true);
      }
    });
  }, [fetchAllData]);

  // Setup handlers
  const handleSetupComplete = async (data: { githubToken?: string; email?: string }) => {
    const updates: Partial<UserSettings> = {};
    if (data.githubToken) updates.githubToken = data.githubToken;
    if (data.email) {
      updates.email = data.email;
      updates.emailEnabled = true;
    }
    if (Object.keys(updates).length > 0) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await fetchAllData();
    }
    localStorage.setItem('gitping_setup_done', 'true');
    setShowSetup(false);
    addToast('Setup complete', data.email ? `Notifications will be sent to ${data.email}` : undefined, 'success');
  };

  const handleSkipSetup = () => {
    localStorage.setItem('gitping_setup_done', 'true');
    setShowSetup(false);
  };

  // Manual scan
  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/monitor/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptions }),
      });
      const data = await res.json();
      if (data.report?.totalMatchesFound > 0) {
        if (settings.soundEnabled) playAlertChime();
        addToast('Scan complete', `${data.report.totalMatchesFound} new matching issue(s)`, 'success');
      } else {
        addToast('Scan complete', 'No new matching issues', 'info');
      }
      await fetchAllData();
      setCountdown(settings.pollingIntervalSeconds || 60);
    } catch {
      addToast('Scan failed', 'Check your network connection', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-polling countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0 && !isScanning) {
      handleManualScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, isScanning]);

  useEffect(() => {
    setCountdown(settings.pollingIntervalSeconds || 60);
  }, [settings.pollingIntervalSeconds]);

  // Repo selection
  const handleSelectRepo = (repo: GitHubRepo) => {
    const existing = subscriptions.find(
      (s) => s.repoFullName.toLowerCase() === repo.full_name.toLowerCase()
    );
    setSelectedRepoForLabels(repo);
    setEditingSubscription(existing);
    setIsLabelModalOpen(true);
  };

  const handleEditSubscription = (sub: Subscription) => {
    setSelectedRepoForLabels({
      id: 1,
      full_name: sub.repoFullName,
      name: sub.repoName,
      owner: { login: sub.repoOwner, avatar_url: sub.repoAvatar || '' },
      description: sub.repoDescription || '',
      stargazers_count: sub.repoStars || 0,
      forks_count: 0,
      open_issues_count: 0,
      language: sub.repoLanguage || null,
      html_url: sub.repoUrl,
      updated_at: sub.lastCheckedAt,
    });
    setEditingSubscription(sub);
    setIsLabelModalOpen(true);
  };

  const handleSaveSubscription = async (payload: any) => {
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save');
    }
    const data = await res.json();
    const savedSub: Subscription = data.subscription;

    setSubscriptions((prev) => {
      const idx = prev.findIndex((s) => s.repoFullName.toLowerCase() === savedSub.repoFullName.toLowerCase());
      const updated = idx >= 0 ? prev.map((s, i) => i === idx ? savedSub : s) : [savedSub, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('gitping_subscriptions', JSON.stringify(updated));
      }
      return updated;
    });

    setActiveTab('tracked');
    addToast('Tracking started', `Monitoring ${payload.repoFullName}`, 'success');

    // Trigger an immediate scan for this repository so issues populate right away
    fetch('/api/monitor/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: savedSub.id, subscriptions: [savedSub] }),
    }).then(() => fetchAllData()).catch(() => {});
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setSubscriptions((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, isActive: !currentActive } : s);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gitping_subscriptions', JSON.stringify(updated));
      }
      return updated;
    });
    await fetch('/api/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !currentActive }),
    });
    fetchAllData();
    addToast(currentActive ? 'Paused' : 'Resumed', '', 'info');
  };

  const handleRemoveLabel = async (id: string, label: string) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;
    const updated = sub.trackedLabels.filter((l) => l !== label);
    if (updated.length === 0) {
      if (confirm(`Remove all labels? This will stop tracking ${sub.repoFullName}.`)) {
        await handleDeleteSubscription(id);
      }
      return;
    }
    setSubscriptions((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, trackedLabels: updated } : s);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gitping_subscriptions', JSON.stringify(next));
      }
      return next;
    });
    await fetch('/api/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, trackedLabels: updated }),
    });
    fetchAllData();
    addToast('Label removed', `Stopped tracking "${label}"`, 'info');
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Stop tracking this repository?')) return;
    setSubscriptions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gitping_subscriptions', JSON.stringify(updated));
      }
      return updated;
    });
    await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' });
    fetchAllData();
    addToast('Removed', 'Repository untracked', 'info');
  };

  const handleScanSingleRepo = async (subId: string) => {
    await fetch('/api/monitor/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: subId, subscriptions }),
    });
    await fetchAllData();
    addToast('Scan done', '', 'success');
  };

  const handleMarkIssueRead = async (id: string) => {
    await fetch('/api/issues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAllData();
  };

  const handleMarkNotifRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAllData();
  };

  const handleMarkAllNotifsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    fetchAllData();
  };

  const handleClearNotifs = async () => {
    await fetch('/api/notifications', { method: 'DELETE' });
    fetchAllData();
  };

  const handleSaveSettings = async (newSettings: Partial<UserSettings>) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    fetchAllData();
    addToast('Settings saved', '', 'success');
  };

  const activeCount = subscriptions.filter((s) => s.isActive).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Github size={22} style={{ color: 'var(--fg-default)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>GitPing</span>
          {activeCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 4 }}>
              {activeCount} repo{activeCount !== 1 ? 's' : ''} tracked
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            title="Time until the next automatic scan"
            style={{
              fontSize: 11,
              color: 'var(--fg-muted)',
              background: 'var(--surface-inset)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            Next scan · {countdown}s
          </span>
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="btn-ghost"
            style={{ fontSize: 13, padding: '5px 10px' }}
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
          <button
            onClick={() => setIsNotifDrawerOpen(true)}
            className="btn-icon"
            style={{ position: 'relative' }}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadNotifCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: 'var(--danger-fg)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                width: 14,
                height: 14,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="btn-icon" title="Settings">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Hero banner */}
      {activeTab === 'issues' && (
        <div style={{
          background: 'radial-gradient(650px circle at 50% -60%, rgba(88, 166, 255, 0.10), transparent 70%), var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '30px 24px',
        }}>
          <div
            className="app-container"
            style={{ padding: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <h1 style={{
              fontSize: 30,
              fontWeight: 700,
              color: 'var(--fg-emphasis)',
              margin: 0,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              maxWidth: 720,
            }}>
              Never miss a critical GitHub issue again
            </h1>

            <p style={{ fontSize: 15, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.6, maxWidth: 660 }}>
              Track <strong style={{ color: 'var(--fg-default)', fontWeight: 600 }}>any GitHub repository</strong> and get notified the{' '}
              <strong style={{ color: 'var(--fg-default)', fontWeight: 600 }}>instant</strong> a new matching issue opens. Follow{' '}
              <strong style={{ color: 'var(--fg-default)', fontWeight: 600 }}>every single issue</strong>, or filter down to the{' '}
              <strong style={{ color: 'var(--fg-default)', fontWeight: 600 }}>specific labels</strong> that actually matter to you.
            </p>
          </div>
        </div>
      )}

      <main className="app-container" style={{ flex: 1, paddingTop: 24, paddingBottom: 48 }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          borderBottom: '1px solid var(--border-muted)',
          marginBottom: 24,
        }}>
          <button
            onClick={() => setActiveTab('issues')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'issues' ? 'var(--fg-default)' : 'var(--fg-muted)',
              borderBottom: activeTab === 'issues' ? '2px solid var(--tab-accent)' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === 'issues' ? 'var(--tab-accent)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Flame size={15} />
            Issues
            {issues.length > 0 && (
              <span style={{
                fontSize: 11,
                background: 'var(--neutral-muted)',
                color: 'var(--fg-default)',
                padding: '0 6px',
                borderRadius: 10,
                fontWeight: 600,
              }}>
                {issues.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tracked')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'tracked' ? 'var(--fg-default)' : 'var(--fg-muted)',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === 'tracked' ? 'var(--tab-accent)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Layers size={15} />
            Tracked
            {subscriptions.length > 0 && (
              <span style={{
                fontSize: 11,
                background: 'var(--neutral-muted)',
                color: 'var(--fg-default)',
                padding: '0 6px',
                borderRadius: 10,
                fontWeight: 600,
              }}>
                {subscriptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'resources' ? 'var(--fg-default)' : 'var(--fg-muted)',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === 'resources' ? 'var(--tab-accent)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BookOpen size={15} />
            Resources
          </button>
        </div>

        {/* Issues tab */}
        {activeTab === 'issues' && (
          <LiveIssueFeed
            issues={issues}
            onMarkRead={handleMarkIssueRead}
            onOpenSimulator={() => {}}
          />
        )}

        {/* Tracked tab */}
        {activeTab === 'tracked' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <RepoSearch
              onSelectRepo={handleSelectRepo}
              trackedRepoNames={subscriptions.map((s) => s.repoFullName.toLowerCase())}
            />

            {subscriptions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                border: '1px solid var(--border-muted)',
                borderRadius: 6,
                color: 'var(--fg-muted)',
              }}>
                <Search size={28} style={{ margin: '0 auto 12px auto', color: 'var(--fg-subtle)' }} />
                <p style={{ fontSize: 14 }}>No tracked repositories yet.</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Search for a repository above to get started.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: 12,
              }}>
                {subscriptions.map((sub) => (
                  <TrackedRepoCard
                    key={sub.id}
                    subscription={sub}
                    onEditLabels={handleEditSubscription}
                    onToggleActive={handleToggleActive}
                    onDeleteSubscription={handleDeleteSubscription}
                    onScanSingleRepo={handleScanSingleRepo}
                    onRemoveLabel={handleRemoveLabel}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources tab */}
        {activeTab === 'resources' && (
          <ResourcesSection />
        )}
      </main>

      {/* Modals */}
      <SetupModal
        isOpen={showSetup}
        onComplete={handleSetupComplete}
        onSkip={handleSkipSetup}
      />

      <LabelSelectorModal
        isOpen={isLabelModalOpen}
        repo={selectedRepoForLabels}
        existingSubscription={editingSubscription}
        onClose={() => setIsLabelModalOpen(false)}
        onSaveSubscription={handleSaveSubscription}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        notifications={notifications}
        onClose={() => setIsNotifDrawerOpen(false)}
        onMarkAsRead={handleMarkNotifRead}
        onMarkAllAsRead={handleMarkAllNotifsRead}
        onClearAll={handleClearNotifs}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
