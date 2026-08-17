'use client';

import React, { useState } from 'react';
import { Github, Mail, ArrowRight } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onComplete: (data: { githubToken?: string; email?: string }) => void;
  onSkip: () => void;
}

export function SetupModal({ isOpen, onComplete, onSkip }: SetupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [githubToken, setGithubToken] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 460 }}>
        {/* Step 1: Email */}
        {step === 1 && (
          <>
            <div style={{ padding: '32px 28px 24px 28px', textAlign: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}>
                <Mail size={24} style={{ color: 'var(--fg-default)' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg-default)', marginBottom: 6 }}>
                Get Notified
              </h2>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                Enter an email to receive alerts when new matching issues are opened. You can change or disable this later in settings.
              </p>
            </div>

            <div style={{ padding: '0 28px 24px 28px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>
                Your email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  background: 'var(--field)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '9px 12px',
                  color: 'var(--fg-default)',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{
              padding: '14px 28px',
              borderTop: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <button onClick={onSkip} className="btn-ghost" style={{ fontSize: 13 }}>
                Skip
              </button>
              <button
                onClick={() => setStep(2)}
                className="btn-primary"
                style={{ fontSize: 13, padding: '7px 16px' }}
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* Step 2: GitHub token (optional) */}
        {step === 2 && (
          <>
            <div style={{ padding: '32px 28px 24px 28px', textAlign: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}>
                <Github size={24} style={{ color: 'var(--fg-default)' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg-default)', marginBottom: 6 }}>
                Connect GitHub
              </h2>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                Add a personal access token to increase API rate limits. This is optional. The app works without it.
              </p>
            </div>

            <div style={{ padding: '0 28px 24px 28px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>
                Personal Access Token (optional)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                style={{
                  width: '100%',
                  background: 'var(--field)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '9px 12px',
                  color: 'var(--fg-default)',
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>
                Token only needs <code style={{ color: 'var(--fg-muted)' }}>public_repo</code> (read-only) scope. Never stored externally.
              </p>
            </div>

            <div style={{
              padding: '14px 28px',
              borderTop: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <button onClick={() => setStep(1)} className="btn-ghost" style={{ fontSize: 13 }}>
                Back
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onComplete({ email: email || undefined })}
                  className="btn-ghost"
                  style={{ fontSize: 13 }}
                >
                  Skip
                </button>
                <button
                  onClick={() => onComplete({ email: email || undefined, githubToken: githubToken || undefined })}
                  className="btn-primary"
                  style={{ fontSize: 13, padding: '7px 16px' }}
                >
                  Start Tracking
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
