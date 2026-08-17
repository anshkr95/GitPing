'use client';

import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '@/lib/types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const BORDER_COLORS: Record<string, string> = {
  success: 'var(--success-fg)',
  error: 'var(--danger-fg)',
  info: 'var(--accent-fg)',
  warning: 'var(--attention-fg)',
};

const ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle size={16} style={{ color: 'var(--success-fg)' }} />,
  error: <AlertCircle size={16} style={{ color: 'var(--danger-fg)' }} />,
  info: <Info size={16} style={{ color: 'var(--accent-fg)' }} />,
  warning: <AlertTriangle size={16} style={{ color: 'var(--attention-fg)' }} />,
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 380,
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${BORDER_COLORS[toast.type] || 'var(--accent-fg)'}`,
            borderRadius: 6,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ marginTop: 1, flexShrink: 0 }}>{ICONS[toast.type]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-default)' }}>{toast.title}</div>
            {toast.description && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--fg-subtle)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
