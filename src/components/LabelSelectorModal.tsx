'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';
import { GitHubRepo, GitHubLabel, Subscription } from '@/lib/types';
import { getContrastTextColor, formatHexColor } from '@/lib/color';

interface LabelSelectorModalProps {
  isOpen: boolean;
  repo: GitHubRepo | null;
  existingSubscription?: Subscription;
  onClose: () => void;
  onSaveSubscription: (payload: {
    repoFullName: string;
    repoOwner: string;
    repoName: string;
    repoUrl: string;
    repoAvatar: string;
    repoStars: number;
    repoDescription: string;
    repoLanguage: string;
    trackedLabels: string[];
    matchMode: 'any' | 'all';
  }) => Promise<void>;
}

export const LabelSelectorModal: React.FC<LabelSelectorModalProps> = ({
  isOpen,
  repo,
  existingSubscription,
  onClose,
  onSaveSubscription,
}) => {
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<'any' | 'all'>('any');
  const [trackAll, setTrackAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !repo) {
      setLabels([]);
      setSelectedLabels([]);
      setSearchQuery('');
      setErrorMsg('');
      return;
    }

    const [owner, name] = repo.full_name.split('/');
    if (existingSubscription) {
      setSelectedLabels(existingSubscription.trackedLabels || []);
      setMatchMode(existingSubscription.matchMode || 'any');
      setTrackAll(existingSubscription.trackedLabels.includes('__ALL__') || false);
    } else {
      setSelectedLabels([]);
      setMatchMode('any');
      setTrackAll(false);
    }

    const fetchLabels = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(`/api/repos/${owner}/${name}/labels`);
        const data = await res.json();
        if (data.labels) {
          setLabels(data.labels);

          if (!existingSubscription || existingSubscription.trackedLabels.length === 0) {
            const defaults = data.labels
              .filter((l: GitHubLabel) => {
                const n = l.name.toLowerCase();
                return (
                  n.includes('good first issue') ||
                  n.includes('help wanted') ||
                  n === 'documentation' ||
                  n.startsWith('doc')
                );
              })
              .map((l: GitHubLabel) => l.name);

            if (defaults.length > 0) {
              setSelectedLabels(defaults);
            } else {
              setTrackAll(true);
              setSelectedLabels(['__ALL__']);
            }
          }
        } else {
          setTrackAll(true);
          setSelectedLabels(['__ALL__']);
        }
      } catch (err: any) {
        setErrorMsg('Failed to load GitHub labels for this repository');
      } finally {
        setLoading(false);
      }
    };

    fetchLabels();
  }, [isOpen, repo, existingSubscription]);

  if (!isOpen || !repo) return null;

  const toggleLabel = (labelName: string) => {
    // Picking a specific label means we're no longer tracking "all labels".
    setTrackAll(false);
    setSelectedLabels((prev) => {
      const base = prev.filter((n) => n !== '__ALL__');
      return base.includes(labelName)
        ? base.filter((n) => n !== labelName)
        : [...base, labelName];
    });
  };

  const applyPreset = (presetType: 'beginner' | 'docs' | 'bugs' | 'clear') => {
    setTrackAll(false);
    if (presetType === 'clear') {
      setSelectedLabels([]);
      return;
    }

    const matchedNames = labels
      .filter((l) => {
        const n = l.name.toLowerCase();
        if (presetType === 'beginner') {
          return n.includes('good first') || n.includes('help wanted') || n.includes('beginner') || n.includes('easy');
        }
        if (presetType === 'docs') {
          return n.includes('doc') || n.includes('documentation') || n.includes('guide');
        }
        if (presetType === 'bugs') {
          return n.includes('bug') || n.includes('defect') || n.includes('issue');
        }
        return false;
      })
      .map((l) => l.name);

    setSelectedLabels((prev) => Array.from(new Set([...prev.filter((n) => n !== '__ALL__'), ...matchedNames])));
  };

  const filteredLabels = labels.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (selectedLabels.length === 0 && !trackAll) {
      setErrorMsg('Please select at least one GitHub issue label to monitor.');
      return;
    }

    const [owner, name] = repo.full_name.split('/');
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSaveSubscription({
        repoFullName: repo.full_name,
        repoOwner: owner,
        repoName: name,
        repoUrl: repo.html_url || `https://github.com/${repo.full_name}`,
        repoAvatar: repo.owner.avatar_url,
        repoStars: repo.stargazers_count,
        repoDescription: repo.description || '',
        repoLanguage: repo.language || '',
        trackedLabels: selectedLabels,
        matchMode,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save repository subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: '600px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '6px', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={repo.owner.avatar_url} alt={repo.full_name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg-default)', margin: 0 }}>{repo.full_name}</h2>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: '4px'
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button onClick={() => applyPreset('beginner')} style={presetButtonStyle}>Good First Issues</button>
            <button onClick={() => applyPreset('docs')} style={presetButtonStyle}>Documentation</button>
            <button onClick={() => applyPreset('bugs')} style={presetButtonStyle}>Bugs</button>
            {!trackAll && selectedLabels.length > 0 && (
              <button onClick={() => applyPreset('clear')} style={{ ...presetButtonStyle, color: 'var(--danger-fg)' }}>Clear</button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search labels..."
              style={{
                width: '100%', backgroundColor: 'var(--field)', border: '1px solid var(--border)', borderRadius: '6px',
                padding: '5px 12px 5px 32px', color: 'var(--fg-default)', fontSize: '14px', outline: 'none'
              }}
            />
          </div>

          {/* Labels Grid */}
          <div style={{
            backgroundColor: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px',
            minHeight: '150px', maxHeight: '250px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start',
            opacity: trackAll ? 0.5 : 1
          }}>
            {loading ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '13px', width: '100%', textAlign: 'center', marginTop: '20px' }}>Loading labels...</div>
            ) : filteredLabels.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '13px', width: '100%', textAlign: 'center', marginTop: '20px' }}>No labels found.</div>
            ) : (
              filteredLabels.map((lbl) => {
                const isSelected = selectedLabels.includes(lbl.name);
                const bgHex = formatHexColor(lbl.color);
                const textClr = getContrastTextColor(lbl.color);

                return (
                  <button
                    key={lbl.name}
                    onClick={() => toggleLabel(lbl.name)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '2em', fontSize: '12px', fontWeight: 500,
                      backgroundColor: bgHex, color: textClr,
                      border: isSelected ? `2px solid var(--fg-default)` : '1px solid transparent',
                      cursor: 'pointer', outline: 'none',
                      opacity: isSelected ? 1 : 0.8
                    }}
                    title={lbl.description || lbl.name}
                  >
                    {isSelected && <Check size={12} />}
                    {lbl.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Select all labels */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
            padding: '10px 12px', borderRadius: '6px',
            border: trackAll ? '1px solid var(--success-fg)' : '1px solid var(--border)',
            backgroundColor: trackAll ? 'rgba(63, 185, 80, 0.08)' : 'var(--surface-inset)',
          }}>
            <input
              type="checkbox"
              checked={trackAll}
              onChange={(e) => {
                const on = e.target.checked;
                setTrackAll(on);
                setSelectedLabels(on ? ['__ALL__'] : []);
              }}
              style={{ accentColor: 'var(--success-fg)', flexShrink: 0 }}
            />
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--fg-default)' }}>Select all labels</span>
          </label>

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-fg)', fontSize: '13px', padding: '8px', backgroundColor: 'rgba(248, 81, 73, 0.1)', borderRadius: '6px' }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px'
        }}>
          <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || (selectedLabels.length === 0 && !trackAll)} style={primaryButtonStyle}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const presetButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--neutral-muted)',
  border: '1px solid var(--border)',
  color: 'var(--fg-default)',
  padding: '4px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
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
