'use client'

import { useState } from 'react'
import { AD_PLATFORMS } from '@/types/integrations'
import { CONNECTABLE_PLATFORMS } from '../constants'
import {
  platformLabel,
  platformColor,
  platformGlyph,
  relativeTime,
  dominantCurrency,
} from './budget-helpers'
import type { PlatformConnectionPublic, BudgetEntry } from '../queries'

type Props = {
  monoFont: string
  connections: PlatformConnectionPublic[]
  entries: BudgetEntry[]
  reconnectHref: string
  busyId: string | null
  onSync: (accountId: string) => void
  onDisconnect: (id: string) => void
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: 'Connected', color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
  expired: { label: 'Expired', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  error: { label: 'Error', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  revoked: { label: 'Revoked', color: '#9aa0aa', bg: '#f1f2f4' },
}

export function BudgetConnections({ monoFont, connections, entries, reconnectHref, busyId, onSync, onDisconnect }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const comingSoon = AD_PLATFORMS.filter((p) => !CONNECTABLE_PLATFORMS.includes(p))

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef0f2' }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Connected accounts</h3>
        <p style={{ fontSize: 12.5, color: '#9aa0aa', margin: '4px 0 0' }}>Read-only access. Disconnect or reconnect a source any time.</p>
      </div>

      {connections.map((cn) => {
        const status = STATUS_STYLES[cn.status] ?? STATUS_STYLES.error
        const needsReconnect = cn.status === 'expired' || cn.status === 'error' || cn.status === 'revoked'
        const accountEntries = entries.filter((e) => e.platform === cn.platform && e.external_account_id === cn.external_account_id)
        const currency = dominantCurrency(accountEntries, 'USD')
        const busy = busyId === cn.id || busyId === cn.external_account_id
        return (
          <div key={cn.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: '1px solid #f1f2f4' }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: platformColor(cn.platform),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: '#fff',
                flex: 'none',
              }}
            >
              {platformGlyph(cn.platform)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#161922' }}>
                  {platformLabel(cn.platform)} · {cn.account_name ?? cn.external_account_id}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: status.color, background: status.bg }}>
                  {status.label}
                </span>
              </div>
              <div style={{ fontFamily: monoFont, fontSize: 11, color: '#9aa0aa', marginTop: 3 }}>
                {cn.external_account_id} · {currency} · synced {relativeTime(cn.last_synced_at)}
              </div>
            </div>

            {needsReconnect ? (
              <a
                href={reconnectHref}
                style={{
                  flex: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Reconnect
              </a>
            ) : confirmId === cn.id ? (
              <div style={{ display: 'flex', gap: 8, flex: 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b727f' }}>Disconnect?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDisconnect(cn.id)
                    setConfirmId(null)
                  }}
                  disabled={busy}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 13px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  disabled={busy}
                  style={{
                    background: '#fff',
                    color: '#4b5563',
                    border: '1px solid #e9ebef',
                    borderRadius: 8,
                    padding: '8px 13px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                <button
                  type="button"
                  onClick={() => onSync(cn.external_account_id)}
                  disabled={busy}
                  style={{
                    background: '#fff',
                    color: '#4b5563',
                    border: '1px solid #e9ebef',
                    borderRadius: 8,
                    padding: '8px 13px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {busy ? 'Syncing…' : 'Sync'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(cn.id)}
                  disabled={busy}
                  style={{
                    background: '#fff',
                    color: '#dc2626',
                    border: '1px solid #e9ebef',
                    borderRadius: 8,
                    padding: '8px 13px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ padding: '14px 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, background: '#fbfbfc' }}>
        {comingSoon.map((platform) => (
          <div
            key={platform}
            style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px dashed #e1e4e9', borderRadius: 10, padding: '11px 12px' }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: platformColor(platform),
                opacity: 0.85,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: '#fff',
                flex: 'none',
              }}
            >
              {platformGlyph(platform)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#3b4252', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {platformLabel(platform)}
              </div>
              <div style={{ fontSize: 10, color: '#9aa0aa' }}>Coming soon</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
