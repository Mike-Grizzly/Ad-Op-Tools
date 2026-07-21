'use client'

import { relativeTime } from '@/features/budget/components/budget-helpers'
import { platformColor, platformGlyph, platformLabel } from '@/lib/platform-meta'
import type { PlatformConnectionPublic } from '@/features/budget/queries'
import { sectionLabel, smallSecondaryBtn } from './clients-helpers'

type Props = {
  clientId: string
  connections: PlatformConnectionPublic[]
  busy: boolean
  onAssign: (connectionId: string, clientId: string | null) => void
}

function ConnectionRow({
  connection,
  action,
  actionLabel,
  busy,
}: {
  connection: PlatformConnectionPublic
  action: () => void
  actionLabel: string
  busy: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f2f4' }}>
      <span
        title={platformLabel(connection.platform)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: platformColor(connection.platform),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 800,
          color: '#fff',
          flex: 'none',
        }}
      >
        {platformGlyph(connection.platform)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: '#161922',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {connection.account_name ?? connection.external_account_id}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9aa0aa', marginTop: 3 }}>
          {connection.external_account_id} · synced {relativeTime(connection.last_synced_at)}
        </div>
      </div>
      <button
        type="button"
        onClick={action}
        disabled={busy}
        style={{ ...smallSecondaryBtn, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}
      >
        {actionLabel}
      </button>
    </div>
  )
}

export function ClientAccountsPanel({ clientId, connections, busy, onAssign }: Props) {
  const assigned = connections.filter((c) => c.client_id === clientId)
  const unassigned = connections.filter((c) => c.client_id === null)

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 4 }}>Ad accounts</div>

      {assigned.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#9aa0aa', padding: '10px 0', borderBottom: '1px solid #f1f2f4' }}>
          No ad accounts assigned yet — spend can&apos;t roll up until one is.
        </div>
      ) : (
        assigned.map((cn) => (
          <ConnectionRow
            key={cn.id}
            connection={cn}
            action={() => onAssign(cn.id, null)}
            actionLabel="Unassign"
            busy={busy}
          />
        ))
      )}

      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563', margin: '16px 0 2px' }}>Assign an account</div>
      {unassigned.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#9aa0aa', padding: '8px 0' }}>
          All connected accounts are assigned. Connect more on the Budget page.
        </div>
      ) : (
        unassigned.map((cn) => (
          <ConnectionRow
            key={cn.id}
            connection={cn}
            action={() => onAssign(cn.id, clientId)}
            actionLabel="Assign"
            busy={busy}
          />
        ))
      )}
    </div>
  )
}
