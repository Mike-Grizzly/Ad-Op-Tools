'use client'

import {
  formatMoneyMicros,
  formatCompactInt,
  formatPct,
  clampPct,
  type Kpis,
  type Pacing,
} from './budget-helpers'

type Props = {
  monoFont: string
  currency: string
  kpis: Kpis
  pacing: Pacing
  delta: { pct: number; up: boolean } | null
  priorLabel: string
}

const TONE_COLORS: Record<Pacing['tone'], { color: string; bg: string }> = {
  good: { color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
  bad: { color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  neutral: { color: '#6b727f', bg: '#f1f2f4' },
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e9ebef',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 1px 2px rgba(22,25,34,.04)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#6b727f' }
const valueStyle: React.CSSProperties = { fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }
const subStyle: React.CSSProperties = { fontSize: 11.5, color: '#9aa0aa', marginTop: 'auto' }

export function BudgetKpiRow({ monoFont, currency, kpis, pacing, delta, priorLabel }: Props) {
  const tone = TONE_COLORS[pacing.tone]
  const barColor = pacing.tone === 'bad' ? '#dc2626' : '#4f46e5'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
      {/* HERO pacing */}
      <div style={{ ...cardStyle, padding: 20, gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelStyle}>Monthly cap pacing</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: tone.color, background: tone.bg }}>
            {pacing.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#161922' }}>
            {formatMoneyMicros(pacing.mtdMicros, currency, { compact: true })}
          </span>
          <span style={{ fontSize: 14, color: '#9aa0aa', fontWeight: 600 }}>
            of {pacing.hasCap ? formatMoneyMicros(pacing.capMicros, currency, { compact: true }) : 'no'} cap
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
                width: pacing.hasCap ? clampPct(pacing.pctUsed) : '0%',
                background: barColor,
                borderRadius: 999,
              }}
            />
          </div>
          {pacing.hasCap && (
            <div style={{ position: 'relative', height: 0 }}>
              <div
                title="Projected end of month"
                style={{
                  position: 'absolute',
                  left: clampPct(pacing.projectedPctOfCap),
                  top: -14,
                  width: 2,
                  height: 14,
                  background: '#161922',
                }}
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6b727f' }}>
          <span>
            <span style={{ fontWeight: 700, color: '#161922' }}>{pacing.hasCap ? formatPct(pacing.pctUsed) : '—'}</span> used
          </span>
          <span>
            Projected EOM{' '}
            <span style={{ fontWeight: 700, color: '#161922' }}>{formatMoneyMicros(pacing.projectedMicros, currency, { compact: true })}</span>
            {pacing.hasCap && ` (${formatPct(pacing.projectedPctOfCap)})`}
          </span>
        </div>
        <div style={{ fontFamily: monoFont, fontSize: 11, color: '#9aa0aa', marginTop: -3 }}>
          ⌁ {pacing.daysLeft} {pacing.daysLeft === 1 ? 'day' : 'days'} left this month
        </div>
      </div>

      {/* Total spend */}
      <div style={cardStyle}>
        <span style={labelStyle}>Total spend</span>
        <span style={valueStyle}>{formatMoneyMicros(kpis.totalMicros, currency, { compact: true })}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 'auto' }}>
          {delta && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: delta.up ? '#16a34a' : '#dc2626',
                background: delta.up ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)',
                borderRadius: 6,
                padding: '2px 7px',
              }}
            >
              {delta.up ? '▲' : '▼'} {formatPct(delta.pct)}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#9aa0aa' }}>{priorLabel}</span>
        </div>
      </div>

      {/* Active campaigns */}
      <div style={cardStyle}>
        <span style={labelStyle}>Active campaigns</span>
        <span style={valueStyle}>{kpis.activeCampaigns}</span>
        <span style={subStyle}>with spend in range</span>
      </div>

      {/* Avg daily */}
      <div style={cardStyle}>
        <span style={labelStyle}>Avg daily spend</span>
        <span style={valueStyle}>{formatMoneyMicros(kpis.avgDailyMicros, currency, { compact: true })}</span>
        <span style={subStyle}>across the selected range</span>
      </div>

      {/* CPC */}
      <div style={cardStyle}>
        <span style={labelStyle}>Avg CPC</span>
        <span style={valueStyle}>{kpis.clicks > 0 ? formatMoneyMicros(kpis.cpcMicros, currency) : '—'}</span>
        <div style={{ display: 'flex', gap: 12, marginTop: 'auto', fontSize: 11, color: '#9aa0aa' }}>
          <span style={{ fontFamily: monoFont }}>{formatCompactInt(kpis.impressions)} impr.</span>
          <span style={{ fontFamily: monoFont }}>{formatCompactInt(kpis.clicks)} clicks</span>
        </div>
      </div>
    </div>
  )
}
