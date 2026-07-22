'use client'

import { useState } from 'react'
import { formatMoneyMicros, formatPct, clampPct } from '@/features/budget/components/budget-helpers'
import { platformColor, platformGlyph, platformLabel } from '@/lib/platform-meta'
import type { Client } from '../queries'
import type { ClientPacing } from '../pacing'
import { barColorFor, pillFor } from './clients-helpers'

type Props = {
  client: Client
  pacing: ClientPacing
  platforms: string[]
  onOpen: () => void
}

export function ClientCard({ client, pacing, platforms, onOpen }: Props) {
  const [hovered, setHovered] = useState(false)
  const hasAccounts = platforms.length > 0
  const pill = pillFor(pacing, hasAccounts)
  const barColor = barColorFor(pacing, hasAccounts)
  const hasBudget = pacing.budgetMicros != null && pacing.budgetMicros > 0

  const footerParts: string[] = []
  if (pacing.pctUsed != null) footerParts.push(`${formatPct(pacing.pctUsed)} paced`)
  footerParts.push(`${pacing.window.daysLeft} ${pacing.window.daysLeft === 1 ? 'day' : 'days'} left`)
  if (pacing.trend) {
    footerParts.push(`${pacing.trend.up ? '▲' : '▼'} ${formatPct(Math.abs(pacing.trend.pct))}`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${client.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        padding: 18,
        boxShadow: hovered ? '0 8px 24px -10px rgba(22,25,34,.18)' : '0 1px 2px rgba(22,25,34,.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'box-shadow .15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span
          title={client.name}
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: '#161922',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {client.name}
        </span>
        <span
          style={{
            flex: 'none',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            color: pill.color,
            background: pill.bg,
          }}
        >
          {pill.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#161922' }}>
          {formatMoneyMicros(pacing.spendMicros, client.currency, { compact: false })}
        </span>
        <span style={{ fontSize: 13, color: '#9aa0aa', fontWeight: 600 }}>
          {hasBudget && pacing.budgetMicros != null
            ? `of ${formatMoneyMicros(pacing.budgetMicros, client.currency, { compact: false })}`
            : 'No budget set'}
        </span>
      </div>

      <div>
        <div style={{ position: 'relative', height: 9, background: '#f1f2f4', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: pacing.pctUsed != null ? clampPct(pacing.pctUsed) : '0%',
              background: barColor,
              borderRadius: 999,
            }}
          />
        </div>
        {hasBudget && pacing.budgetMicros != null && (
          <div style={{ position: 'relative', height: 0 }}>
            <div
              title="Projected end of cycle"
              style={{
                position: 'absolute',
                left: clampPct(pacing.projectedMicros / pacing.budgetMicros),
                top: -14,
                width: 2,
                height: 14,
                background: '#161922',
              }}
            />
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#9aa0aa' }}>
        {hasAccounts ? footerParts.join(' · ') : 'Assign an ad account to track spend'}
      </div>

      {platforms.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {platforms.map((platform) => (
            <span
              key={platform}
              title={platformLabel(platform)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 5,
                background: platformColor(platform),
                color: '#fff',
                fontSize: 8,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              {platformGlyph(platform)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
