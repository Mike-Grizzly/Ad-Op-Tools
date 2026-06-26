'use client'

import { formatMoneyMicros, formatPct, type PlatformTotal } from './budget-helpers'

type Props = {
  monoFont: string
  currency: string
  totals: PlatformTotal[]
}

const R = 54
const CIRCUMFERENCE = 2 * Math.PI * R

export function BudgetPlatformDonut({ monoFont, currency, totals }: Props) {
  const spent = totals.filter((t) => t.micros > 0)
  const grandTotal = spent.reduce((acc, t) => acc + t.micros, 0)

  // Accumulate rotation so segments sit end-to-end starting at 12 o'clock. The running
  // offset is the sum of all prior segment lengths — computed without render-time mutation.
  const segments = spent.map((t, i) => {
    const fraction = grandTotal > 0 ? t.micros / grandTotal : 0
    const len = fraction * CIRCUMFERENCE
    const priorFraction = spent.slice(0, i).reduce((sum, s) => sum + (grandTotal > 0 ? s.micros / grandTotal : 0), 0)
    const rotation = -90 + priorFraction * 360
    return { color: t.color, dasharray: `${len.toFixed(2)} ${(CIRCUMFERENCE - len).toFixed(2)}`, rotate: `rotate(${rotation.toFixed(2)} 70 70)` }
  })

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        padding: '18px 20px',
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
      }}
    >
      <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 14px' }}>Spend by platform</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 140, height: 140, flex: 'none' }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f2f4" strokeWidth="18" />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="18"
                strokeDasharray={seg.dasharray}
                transform={seg.rotate}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {formatMoneyMicros(grandTotal, currency, { compact: true })}
            </span>
            <span style={{ fontFamily: monoFont, fontSize: 9, color: '#9aa0aa', marginTop: 2 }}>total spend</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {totals.map((t) => (
          <div key={t.platform}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: t.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#161922' }}>{t.name}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 5,
                    color: t.connected ? '#16a34a' : '#9aa0aa',
                    background: t.connected ? 'rgba(22,163,74,.1)' : '#f1f2f4',
                  }}
                >
                  {t.connected ? 'Connected' : 'Soon'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: monoFont, fontSize: 11.5, fontWeight: 600, color: '#161922' }}>
                  {formatMoneyMicros(t.micros, currency, { compact: true })}
                </span>
                <span style={{ fontFamily: monoFont, fontSize: 10, color: '#9aa0aa', marginLeft: 7 }}>{formatPct(t.share)}</span>
              </div>
            </div>
            <div style={{ height: 6, background: '#f1f2f4', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(t.share * 100).toFixed(1)}%`, background: t.color, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
