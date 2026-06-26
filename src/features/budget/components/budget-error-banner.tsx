'use client'

type Props = {
  status: 'expired' | 'error'
  lastSyncedLabel: string
  reconnectHref: string
}

export function BudgetErrorBanner({ status, lastSyncedLabel, reconnectHref }: Props) {
  const title = status === 'expired' ? 'Your Meta connection expired' : 'Your Meta connection hit an error'
  const detail =
    status === 'expired'
      ? `Spend stopped syncing — the figures below may be stale (last synced ${lastSyncedLabel}).`
      : `The last sync failed (last synced ${lastSyncedLabel}). Reconnect Meta to refresh your spend.`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: '#fff',
        border: '1px solid rgba(220,38,38,.28)',
        borderLeft: '3px solid #dc2626',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 22,
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          flex: 'none',
          borderRadius: 999,
          background: 'rgba(220,38,38,.1)',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        !
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#161922' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: '#6b727f', marginTop: 2 }}>{detail}</div>
      </div>
      <a
        href={reconnectHref}
        style={{
          flex: 'none',
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        Reconnect Meta
      </a>
    </div>
  )
}
