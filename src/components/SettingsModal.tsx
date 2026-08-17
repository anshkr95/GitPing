'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Monitor } from 'lucide-react';
import { UserSettings } from '@/lib/types';
import {
  getStoredTheme,
  getStoredThemeMode,
  persistTheme,
  ThemeMode,
  ThemeName,
} from '@/lib/theme';

interface SettingsModalProps {
  isOpen: boolean;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: Partial<UserSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [email, setEmail] = useState(settings.email || '');
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [browserNotifyEnabled, setBrowserNotifyEnabled] = useState(settings.browserNotifyEnabled);
  const [githubToken, setGithubToken] = useState(settings.githubToken || '');
  const [pollingInterval, setPollingInterval] = useState(settings.pollingIntervalSeconds || 60);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleSendTestEmail = async () => {
    if (!email || !email.includes('@')) {
      setTestEmailMsg({ text: 'Please enter a valid email address first.', success: false });
      return;
    }
    setIsTestingEmail(true);
    setTestEmailMsg(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailMsg({ text: 'Test email sent! Check your inbox.', success: true });
      } else {
        setTestEmailMsg({ text: data.error || 'Failed to send test email.', success: false });
      }
    } catch (err: any) {
      setTestEmailMsg({ text: err.message || 'Network error sending test email', success: false });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Theme lives in localStorage (applied immediately, saved automatically),
  // independent of the server-persisted settings above.
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  useEffect(() => {
    setThemeMode(getStoredThemeMode());
    setThemeName(getStoredTheme());
  }, []);

  const chooseMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    persistTheme(mode, themeName);
  };
  const chooseTheme = (name: ThemeName) => {
    setThemeMode('single');
    setThemeName(name);
    persistTheme('single', name);
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        email,
        emailEnabled,
        soundEnabled,
        browserNotifyEnabled,
        githubToken,
        pollingIntervalSeconds: pollingInterval,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(1, 4, 9, 0.6)'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '6px', display: 'flex', flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg-default)', margin: 0 }}>Settings</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: '4px'
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={formGroupStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={labelStyle}>Email Address</label>
              {email && (
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isTestingEmail}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-fg)',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  {isTestingEmail ? 'Sending test...' : 'Send Test Email'}
                </button>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setTestEmailMsg(null);
              }}
              placeholder="email@example.com"
              style={inputStyle}
            />
            {testEmailMsg && (
              <span style={{
                fontSize: 12,
                marginTop: 4,
                color: testEmailMsg.success ? 'var(--success-fg)' : 'var(--danger-fg)',
              }}>
                {testEmailMsg.text}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Alerts</label>
            <div style={{
              display: 'flex', flexDirection: 'column',
              background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: '6px',
              padding: '4px 14px',
            }}>
              <ToggleRow
                label="Email alerts"
                description="Send a notification email for each matching issue."
                checked={emailEnabled}
                onChange={setEmailEnabled}
              />
              <div style={{ height: 1, background: 'var(--border-muted)' }} />
              <ToggleRow
                label="Sound alerts"
                description="Play a sound when a new issue is detected."
                checked={soundEnabled}
                onChange={setSoundEnabled}
              />
              <div style={{ height: 1, background: 'var(--border-muted)' }} />
              <ToggleRow
                label="Browser notifications"
                description="Show a desktop notification via your browser."
                checked={browserNotifyEnabled}
                onChange={setBrowserNotifyEnabled}
              />
            </div>
          </div>

          {/* Theme preferences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Theme preferences</label>
            <p style={{ fontSize: '12px', color: 'var(--fg-muted)', lineHeight: 1.5, margin: 0 }}>
              Choose how GitPing looks to you. Select a single theme, or sync with your system and
              automatically switch between day and night themes. Selections are applied immediately
              and saved automatically.
            </p>

            {/* Theme mode */}
            <div style={{ marginTop: '2px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fg-muted)', marginBottom: '6px' }}>Theme mode</div>
              <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <button type="button" onClick={() => chooseMode('single')} style={modeButtonStyle(themeMode === 'single')}>
                  Single theme
                </button>
                <button
                  type="button"
                  onClick={() => chooseMode('system')}
                  style={{ ...modeButtonStyle(themeMode === 'system'), borderLeft: '1px solid var(--border)' }}
                >
                  <Monitor size={13} /> Sync with system
                </button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginTop: '6px' }}>
                {themeMode === 'single'
                  ? 'GitPing will use your selected theme.'
                  : 'GitPing will automatically switch between day and night to match your system.'}
              </div>
            </div>

            {/* Theme cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
              <ThemeCard
                name="Light default"
                subtitle="Standard light theme."
                palette={LIGHT_PREVIEW}
                selected={themeMode === 'single' && themeName === 'light'}
                onSelect={() => chooseTheme('light')}
              />
              <ThemeCard
                name="Dark default"
                subtitle="Standard dark theme."
                palette={DARK_PREVIEW}
                selected={themeMode === 'single' && themeName === 'dark'}
                onSelect={() => chooseTheme('dark')}
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Polling Interval (seconds)</label>
            <input
              type="number"
              min="10"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(parseInt(e.target.value, 10))}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>GitHub Personal Access Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              style={inputStyle}
            />
            <span style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '4px' }}>Used to increase API rate limits.</span>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px'
          }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
            <button type="submit" disabled={isSaving} style={primaryButtonStyle}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', cursor: 'pointer', padding: '10px 0',
    }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: 'var(--fg-default)', fontSize: '14px', fontWeight: 500 }}>{label}</span>
        {description && (
          <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>
            {description}
          </span>
        )}
      </span>
      <span style={{ position: 'relative', flexShrink: 0, width: '40px', height: '22px' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }}
        />
        <span aria-hidden style={{
          display: 'block', width: '40px', height: '22px', borderRadius: '9999px',
          background: checked ? 'var(--success-emphasis)' : 'var(--neutral-emphasis)', transition: 'background 0.15s ease',
        }}>
          <span style={{
            position: 'absolute', top: '2px', left: checked ? '20px' : '2px',
            width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff',
            transition: 'left 0.15s ease', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }} />
        </span>
      </span>
    </label>
  );
}

interface ThemePalette {
  canvas: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

// Preview swatches use literal colors on purpose: each card must always show
// what that theme looks like, regardless of the currently active theme.
const LIGHT_PREVIEW: ThemePalette = { canvas: '#ffffff', surface: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#59636e', accent: '#0969da' };
const DARK_PREVIEW: ThemePalette = { canvas: '#0d1117', surface: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#8b949e', accent: '#58a6ff' };

interface ThemeCardProps {
  name: string;
  subtitle: string;
  palette: ThemePalette;
  selected: boolean;
  onSelect: () => void;
}

function ThemeCard({ name, subtitle, palette, selected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: 'left', cursor: 'pointer', padding: '10px',
        background: 'var(--surface)',
        border: `1px solid ${selected ? 'var(--accent-fg)' : 'var(--border)'}`,
        boxShadow: selected ? '0 0 0 3px rgba(88, 166, 255, 0.25)' : 'none',
        borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px',
      }}
    >
      {/* Mini window preview */}
      <div style={{
        height: 54, borderRadius: 6, border: `1px solid ${palette.border}`,
        background: palette.canvas, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          height: 14, background: palette.surface, borderBottom: `1px solid ${palette.border}`,
          display: 'flex', alignItems: 'center', gap: 3, padding: '0 5px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.accent }} />
          <span style={{ width: 22, height: 3, borderRadius: 2, background: palette.text }} />
        </div>
        <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ width: '70%', height: 3, borderRadius: 2, background: palette.text }} />
          <span style={{ width: '50%', height: 3, borderRadius: 2, background: palette.muted }} />
          <span style={{ width: 26, height: 6, borderRadius: 3, background: palette.accent, marginTop: 2 }} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-default)' }}>{name}</span>
          {selected && <Check size={14} style={{ color: 'var(--accent-fg)' }} />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function modeButtonStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', fontSize: '13px', fontWeight: active ? 600 : 500,
    border: 'none', cursor: 'pointer',
    background: active ? 'var(--neutral-emphasis)' : 'transparent',
    color: active ? 'var(--fg-default)' : 'var(--fg-muted)',
  };
}

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--fg-default)'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--field)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '6px 12px',
  color: 'var(--fg-default)',
  fontSize: '14px',
  outline: 'none'
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--neutral-muted)',
  border: '1px solid var(--border)',
  color: 'var(--fg-default)',
  padding: '5px 16px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--success-emphasis)',
  border: '1px solid rgba(240, 246, 252, 0.1)',
  color: '#ffffff',
  padding: '5px 16px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};
