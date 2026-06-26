'use client'

import { useState } from 'react'
import { buildChartGeometry, formatMoneyMicros, shortDate, type DailyPoint } from './budget-helpers'

type Props = {
  monoFont: string
  points: DailyPoint[]
  currency: string
}

const WIDTH = 680
const HEIGHT = 190

export function BudgetSpendChart({ monoFont, points, currency }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const hasData = points.some((p) => p.micros > 0)
  const geo = buildChartGeometry(points, currency, WIDTH, HEIGHT)

  const hoverPoint = hover != null ? points[hover] : null
  const hoverLeftPct = hover != null && points.length > 1 ? (hover / (points.length - 1)) * 100 : 50
  const hoverTopPct =
    hoverPoint != null ? (1 - (geo.maxMicros ? hoverPoint.micros / geo.maxMicros : 0)) * 100 : 0

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        padding: '18px 20px 14px',
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Spend over time</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6b727f' }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: '#0866FF' }} />
          Meta
        </div>
      </div>

      {hasData ? (
        <>
          <div onMouseLeave={() => setHover(null)} style={{ position: 'relative', height: HEIGHT }}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" style={{ width: '100%', height: HEIGHT, display: 'block' }}>
              <defs>
                <linearGradient id="bArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0866FF" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0866FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              {geo.gridLines.map((g, i) => (
                <line key={i} x1="0" x2={WIDTH} y1={g.y} y2={g.y} stroke="#eef0f2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <path d={geo.areaPath} fill="url(#bArea)" />
              <path d={geo.linePath} fill="none" stroke="#0866FF" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>

            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 34,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}
            >
              {[...geo.gridLines].reverse().map((g, i) => (
                <span
                  key={i}
                  style={{ fontFamily: monoFont, fontSize: 9.5, color: '#b6bcc6', background: '#fff', paddingRight: 3 }}
                >
                  {g.label}
                </span>
              ))}
            </div>

            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              {points.map((_, i) => (
                <div key={i} onMouseEnter={() => setHover(i)} style={{ flex: 1, height: '100%' }} />
              ))}
            </div>

            {hoverPoint && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: `${hoverLeftPct}%`,
                    top: `${hoverTopPct}%`,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: '#0866FF',
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 1px #0866FF',
                    transform: 'translate(-50%,-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `${hoverLeftPct}%`,
                    top: `${hoverTopPct}%`,
                    transform: 'translate(-50%,-130%)',
                    background: '#10121a',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '7px 10px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 8px 20px -6px rgba(0,0,0,.4)',
                  }}
                >
                  <div style={{ fontFamily: monoFont, fontSize: 9.5, color: '#9aa1ad' }}>{shortDate(hoverPoint.date)}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{formatMoneyMicros(hoverPoint.micros, currency)}</div>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 34 }}>
            {geo.xLabels.map((x) => (
              <span key={x.index} style={{ fontFamily: monoFont, fontSize: 10, color: '#9aa0aa' }}>
                {x.label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            height: 214,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#9aa0aa',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#6b727f' }}>No spend in this range</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try a wider date range to see activity.</div>
        </div>
      )}
    </div>
  )
}
