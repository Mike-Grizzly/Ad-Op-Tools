'use client'

import { primaryBtn } from './clients-helpers'

type Props = {
  onAdd: () => void
}

export function ClientsEmptyState({ onAdd }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        padding: '46px 36px 44px',
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            background: 'rgba(79,70,229,.09)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7.5" width="18" height="13" rx="2.5" />
            <path d="M8.5 7.5V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
            <path d="M3 13h18" />
          </svg>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>Add your first client</div>
        <p style={{ fontSize: 14, color: '#6b727f', margin: '8px 0 0', lineHeight: 1.6 }}>
          Track every client&apos;s monthly budget and pacing in one place — assign their ad accounts and spend rolls up automatically.
        </p>
        <button type="button" onClick={onAdd} style={{ ...primaryBtn, marginTop: 22, padding: '11px 20px' }}>
          Add client
        </button>
      </div>
    </div>
  )
}
