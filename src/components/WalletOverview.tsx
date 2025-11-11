'use client';

import React from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { useWalletSummary } from '@/hooks/useWalletSummary';
import { formatCurrency } from '@/lib/ui/formatters';

export function WalletOverview() {
  const { user } = useAuthContext();
  const { summary, loading, error, refresh } = useWalletSummary();

  if (!user) {
    return (
      <section className="cel-card">
        <header className="cel-card__header">
          <p className="cel-eyebrow">Wallet</p>
          <h2 className="cel-title">Account overview</h2>
        </header>
        <p className="cel-body">Sign in to view your balances and recent wallet activity.</p>
      </section>
    );
  }

  return (
    <section className="cel-card">
      <header className="cel-card__header">
        <p className="cel-eyebrow">Wallet</p>
        <h2 className="cel-title">Account overview</h2>
        <button type="button" className="cel-button cel-button--ghost" onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </header>

      <div className="cel-card__content">
        <div className="cel-metric">
          <span className="cel-metric__label">Total balance</span>
          <span className="cel-metric__value">
            {loading ? 'Loading…' : formatCurrency(summary?.totalBalance ?? 0, summary?.currency ?? 'USD')}
          </span>
          <span className="cel-metric__caption">{summary?.holdings.length ?? 0} active accounts</span>
        </div>

        <div className="cel-info-block">
          <span className="cel-info-block__label">Signed in as</span>
          <span className="cel-info-block__value">{user.email}</span>
          <span className="cel-info-block__caption">Protected by Azure AD B2C</span>
        </div>

        {error ? (
          <p className="cel-error" role="alert">
            {error}
          </p>
        ) : null}

        {summary?.holdings?.length ? (
          <div className="cel-holdings">
            {summary.holdings.slice(0, 3).map((holding) => (
              <div key={holding.id} className="cel-holding-row">
                <div>
                  <p className="cel-holding-row__title">{holding.label}</p>
                  <p className="cel-holding-row__caption">{holding.currency}</p>
                </div>
                <p className="cel-holding-row__value">{formatCurrency(holding.balance, holding.currency)}</p>
              </div>
            ))}
            {summary.holdings.length > 3 ? (
              <p className="cel-note">+ {summary.holdings.length - 3} more accounts</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
