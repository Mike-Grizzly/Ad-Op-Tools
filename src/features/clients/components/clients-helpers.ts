import type { CSSProperties } from 'react'
import type { Client } from '../queries'
import type { ClientPacing, PacingStatus } from '../pacing'
import type { ClientSort } from '../constants'
import type { PlatformConnectionPublic } from '@/features/budget/queries'

export type ClientWithPacing = { client: Client; pacing: ClientPacing }

export const STATUS_PILLS: Record<PacingStatus, { label: string; color: string; bg: string }> = {
  green: { label: 'On pace', color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
  yellow: { label: 'Off pace', color: '#d97706', bg: 'rgba(217,119,6,.1)' },
  red: { label: 'At risk', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  none: { label: 'No budget', color: '#6b727f', bg: '#f1f2f4' },
}

const STATUS_RANK: Record<PacingStatus, number> = { red: 0, yellow: 1, green: 2, none: 3 }

export function statusBarColor(status: PacingStatus): string {
  return status === 'none' ? '#c6cad2' : STATUS_PILLS[status].color
}

export const SORT_LABELS: Record<ClientSort, string> = {
  'at-risk': 'Most at risk',
  alphabetical: 'Alphabetical',
  'highest-spend': 'Highest spend',
}

export function sortClients(rows: ClientWithPacing[], sort: ClientSort): ClientWithPacing[] {
  const copy = [...rows]
  if (sort === 'alphabetical') {
    return copy.sort((a, b) => a.client.name.localeCompare(b.client.name))
  }
  if (sort === 'highest-spend') {
    return copy.sort((a, b) => b.pacing.spendMicros - a.pacing.spendMicros)
  }
  return copy.sort((a, b) => {
    const rank = STATUS_RANK[a.pacing.status] - STATUS_RANK[b.pacing.status]
    if (rank !== 0) return rank
    return Math.abs(b.pacing.deviation ?? 0) - Math.abs(a.pacing.deviation ?? 0)
  })
}

// Distinct platforms that have at least one connected ad account assigned to the client.
export function assignedPlatforms(
  connections: PlatformConnectionPublic[],
  clientId: string
): string[] {
  return [
    ...new Set(connections.filter((c) => c.client_id === clientId).map((c) => c.platform)),
  ].sort()
}

// ── Shared style objects (design-system tokens) ───────────────────────────────

export const primaryBtn: CSSProperties = {
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  padding: '10px 16px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const secondaryBtn: CSSProperties = {
  background: '#fff',
  color: '#4b5563',
  border: '1px solid #e1e4e9',
  borderRadius: 9,
  padding: '10px 16px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const smallSecondaryBtn: CSSProperties = {
  background: '#fff',
  color: '#4b5563',
  border: '1px solid #e9ebef',
  borderRadius: 8,
  padding: '8px 13px',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  flex: 'none',
}

export const monoInput: CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  color: '#161922',
  background: '#fff',
  border: '1px solid #e1e4e9',
  borderRadius: 9,
  padding: '9px 11px',
  outline: 'none',
}

export const fieldLabel: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#4b5563',
  marginBottom: 6,
}

export const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: '#9aa0aa',
  fontWeight: 600,
}

export const inputWrap: CSSProperties = { position: 'relative' }

export const dollarPrefix: CSSProperties = {
  position: 'absolute',
  left: 11,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9aa0aa',
  fontSize: 13,
  pointerEvents: 'none',
}
