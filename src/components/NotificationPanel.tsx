'use client';

import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPanelProps {
  title?: string;
  limit?: number;
  showFooter?: boolean;
}

export function NotificationPanel({ title = 'Security notifications', limit = 5, showFooter = true }: NotificationPanelProps) {
  const { notifications, loading, error, refresh, unreadCount } = useNotifications();
  const list = notifications.slice(0, limit);

  return (
    <section className="cel-card">
      <header className="cel-card__header">
        <div>
          <p className="cel-eyebrow">Alerts</p>
          <h2 className="cel-title">{title}</h2>
        </div>
        <div className="cel-card__actions">
          {unreadCount > 0 ? <span className="cel-badge">{unreadCount} new</span> : null}
          <button type="button" className="cel-button cel-button--ghost" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <div className="cel-card__content cel-card__content--tight">
        {loading && list.length === 0 ? <p className="cel-body">Loading notifications…</p> : null}
        {error ? (
          <p className="cel-error" role="alert">
            {error}
          </p>
        ) : null}

        {list.length === 0 && !loading ? (
          <p className="cel-body">You're all caught up. We'll notify you when something changes.</p>
        ) : (
          <ul className="cel-list">
            {list.map((item) => (
              <li key={item.id} className={`cel-list__item cel-list__item--${item.severity ?? 'info'}`}>
                <div>
                  <p className="cel-list__title">{item.title}</p>
                  <p className="cel-list__body">{item.body}</p>
                </div>
                <time className="cel-list__time">
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showFooter ? (
        <footer className="cel-card__footer">
          <span className="cel-link" role="link">
            View notification settings
          </span>
        </footer>
      ) : null}
    </section>
  );
}

