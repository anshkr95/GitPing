'use client';

import React from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import { NotificationItem } from '@/lib/types';
import { formatRelativeTime } from '@/lib/time';

interface NotificationDrawerProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, display: 'flex', justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)',
        height: '100%', display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg-default)', margin: 0 }}>Notifications</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notifications.length > 0 && (
              <>
                <button onClick={onMarkAllAsRead} style={iconButtonStyle} title="Mark all as read">
                  <Check size={16} />
                </button>
                <button onClick={onClearAll} style={{ ...iconButtonStyle, color: 'var(--danger-fg)' }} title="Clear all">
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button onClick={onClose} style={iconButtonStyle} title="Close notifications">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.length === 0 ? (
            <div style={{ color: 'var(--fg-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
              No notifications
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  backgroundColor: notif.isRead ? 'var(--surface-inset)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative'
                }}
              >
                {!notif.isRead && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-fg)' }} />
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', color: 'var(--fg-muted)' }}>
                  <span>{notif.repoFullName} #{notif.issueNumber}</span>
                  <span style={{ marginRight: notif.isRead ? 0 : '12px' }}>{formatRelativeTime(notif.createdAt)}</span>
                </div>
                
                <a
                  href={notif.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg-default)', textDecoration: 'none', lineHeight: 1.4 }}
                  onClick={() => { if (!notif.isRead) onMarkAsRead(notif.id); }}
                >
                  {notif.issueTitle}
                </a>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {notif.matchedLabels.map((lbl, idx) => (
                    <span key={idx} style={{
                      backgroundColor: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-fg)', border: '1px solid rgba(88, 166, 255, 0.2)',
                      padding: '2px 6px', borderRadius: '2em', fontSize: '12px'
                    }}>
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px'
};
