'use client';

import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Edit2, Trash2, X, Pause, Play } from 'lucide-react';
import { Subscription } from '@/lib/types';

interface TrackedRepoCardProps {
  subscription: Subscription;
  onEditLabels: (subscription: Subscription) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onDeleteSubscription: (id: string) => void;
  onScanSingleRepo: (id: string) => Promise<void>;
  onRemoveLabel: (id: string, labelToRemove: string) => void;
}

export function TrackedRepoCard({
  subscription,
  onEditLabels,
  onToggleActive,
  onDeleteSubscription,
  onScanSingleRepo,
  onRemoveLabel,
}: TrackedRepoCardProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await onScanSingleRepo(subscription.id);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--canvas)',
      padding: 16,
      opacity: subscription.isActive ? 1 : 0.6,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={subscription.repoAvatar || 'https://avatars.githubusercontent.com/u/0'}
            alt=""
            style={{ width: 32, height: 32, borderRadius: 6 }}
          />
          <div>
            <a
              href={subscription.repoUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent-fg)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
            >
              {subscription.repoFullName}
            </a>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {subscription.repoLanguage && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-fg)', display: 'inline-block' }} />
                  {subscription.repoLanguage}
                </span>
              )}
              {subscription.repoStars != null && (
                <span>★ {subscription.repoStars.toLocaleString()}</span>
              )}
              {!subscription.trackedLabels.includes('__ALL__') && (
                <span>{subscription.matchMode === 'all' ? 'Match ALL' : 'Match ANY'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => onToggleActive(subscription.id, subscription.isActive)}
          style={{
            background: subscription.isActive ? 'rgba(63, 185, 80, 0.15)' : 'rgba(139, 148, 158, 0.1)',
            border: `1px solid ${subscription.isActive ? 'rgba(63, 185, 80, 0.4)' : 'var(--border)'}`,
            color: subscription.isActive ? 'var(--success-fg)' : 'var(--fg-muted)',
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {subscription.isActive ? <Play size={10} /> : <Pause size={10} />}
          {subscription.isActive ? 'Active' : 'Paused'}
        </button>
      </div>

      {/* Tracked labels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {subscription.trackedLabels.includes('__ALL__') ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--success-emphasis)',
              color: '#ffffff',
              border: '1px solid var(--success-emphasis-hover)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            All labels
          </span>
        ) : (
          subscription.trackedLabels.map((label) => (
            <span
              key={label}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--neutral-muted)',
                color: 'var(--fg-default)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {label}
              <button
                onClick={() => onRemoveLabel(subscription.id, label)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--fg-subtle)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={11} />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTop: '1px solid var(--border-muted)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
          {subscription.matchedCount || 0} matched
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={handleScan} disabled={scanning || !subscription.isActive} className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }}>
            <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
            Scan
          </button>
          <button onClick={() => onEditLabels(subscription)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }}>
            <Edit2 size={12} />
            Edit
          </button>
          <button onClick={() => onDeleteSubscription(subscription.id)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger-fg)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
