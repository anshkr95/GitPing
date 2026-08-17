'use client';

import React, { useState } from 'react';
import { CircleDot, ExternalLink, Search } from 'lucide-react';
import { DetectedIssue } from '@/lib/types';
import { formatHexColor, getContrastTextColor } from '@/lib/color';
import { formatRelativeTime, isRecentlyCreated } from '@/lib/time';

interface LiveIssueFeedProps {
  issues: DetectedIssue[];
  onMarkRead: (id: string) => void;
  onOpenSimulator: () => void;
}

export function LiveIssueFeed({ issues, onMarkRead, onOpenSimulator }: LiveIssueFeedProps) {
  const [filterRepo, setFilterRepo] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueRepos = Array.from(new Set(issues.map((i) => i.repoFullName)));

  const filteredIssues = issues.filter((issue) => {
    if (filterRepo !== 'all' && issue.repoFullName !== filterRepo) return false;
    if (searchQuery && !issue.issueTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      {/* Filter bar */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {uniqueRepos.length > 1 && (
          <select
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            style={{
              background: 'var(--field)',
              border: '1px solid var(--border)',
              color: 'var(--fg-default)',
              fontSize: 13,
              borderRadius: 6,
              padding: '5px 10px',
            }}
          >
            <option value="all">All Repositories</option>
            {uniqueRepos.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input
            type="text"
            placeholder="Filter issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--field)',
              border: '1px solid var(--border)',
              color: 'var(--fg-default)',
              fontSize: 13,
              borderRadius: 6,
              padding: '5px 10px 5px 30px',
            }}
          />
        </div>
      </div>

      {/* Issue list */}
      {filteredIssues.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
          <p style={{ fontSize: 14 }}>No issues caught yet.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Add a repository and select labels to start monitoring.</p>
        </div>
      ) : (
        filteredIssues.map((issue) => (
          <div
            key={issue.id}
            style={{
              borderBottom: '1px solid var(--border-muted)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: issue.isRead ? 'transparent' : 'rgba(56, 139, 253, 0.04)',
            }}
          >
            {/* Open issue icon */}
            <CircleDot size={16} style={{ color: 'var(--success-fg)', marginTop: 3, flexShrink: 0 }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <a
                  href={issue.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--fg-default)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-fg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-default)')}
                >
                  {issue.issueTitle}
                </a>
                {/* Label badges */}
                {issue.labels.map((label) => {
                  const bg = formatHexColor(label.color);
                  const text = getContrastTextColor(label.color);
                  return (
                    <span
                      key={label.name}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '1px 7px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: bg,
                        color: text,
                        border: '1px solid rgba(0,0,0,0.15)',
                        lineHeight: '18px',
                      }}
                    >
                      {label.name}
                    </span>
                  );
                })}
                {isRecentlyCreated(issue.detectedAt, 1) && !issue.isRead && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-fg)', display: 'inline-block' }} title="Recently caught" />
                )}
              </div>

              {/* Meta row */}
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <a
                  href={`https://github.com/${issue.repoFullName}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}
                >
                  {issue.repoFullName}
                </a>
                <span>#{issue.issueNumber}</span>
                <span>·</span>
                <span>opened {formatRelativeTime(issue.createdAt)}</span>
                <span>by</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <img src={issue.authorAvatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                  {issue.authorLogin}
                </span>
                {!issue.isRead && (
                  <>
                    <span>·</span>
                    <button
                      onClick={() => onMarkRead(issue.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-fg)',
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Mark read
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
