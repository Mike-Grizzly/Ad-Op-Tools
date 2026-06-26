'use client'

import { useEffect } from 'react'
import {
  formatMoneyMicros,
  formatInt,
  formatPct,
  buildChartGeometry,
  dailySeries,
  daysInRangeInclusive,
  sumMicros,
  sumImpressions,
  sumClicks,
} from './budget-helpers'
import type { BudgetEntry } from '../queries'

type Props = {
  monoFont: string
  campaignId: string
  entries: BudgetEntry[]
  nowIso: string
  onClose: () => void
}

const SPARK_W = 252
const SPARK_H = 64

function last14Range(entries: BudgetEntry[], nowIso: string): { from: string; to: string } {
  const dates = entries.map((e) => e.entry_date).sort()
  const to = dates[dates.length - 1] ?? nowIso.slice(0, 10)
  const fromDate = new Date(`${to}T00:00:00Z`)
  fromDate.setUTCDate(fromDate.getUTCDate() - 13)
  return { from: fromDate.toISOString().slice(0, 10), to }
}

export function BudgetDetailDrawer({ monoFont, campaignId, entries, nowIso, onClose }: Props) {
  const campaignEntries = entries.filter((e) => e.campaign_external_id === campaignId)
  const name = campaignEntries[0]?.campaign_name ?? campaignId
  const currency = campaignEntries[0]?.currency ?? 'USD'

  const { from, to } = last14Range(campaignEntries, nowIso)
  const series = dailySeries(campaignEntries, from, to)
  const geo = buildChartGeometry(series, currency, SPARK_W, SPARK_H)

  const spendMicros = sumMicros(campaignEntries)
  const impressions = sumImpressions(campaignEntries)
  const clicks = sumClicks(campaignEntries)
  const ctr = impressions > 0 ? clicks / impressions : 0
  const cpcMicros = clicks > 0 ? spendMicros / clicks : 0
  const days = daysInRangeInclusive(from, to)

  const metrics: { label: string; value: string }[] = [
    { label: 'Total spend', value: formatMoneyMicros(spendMicros, currency) },
    { label: 'Avg daily', value: formatMoneyMicros(spendMicros / days, currency) },
    { label: 'Impressions', value: formatInt(impressions) },
    { label: 'Clicks', value: formatInt(clicks) },
    { label: 'CTR', value: impressions > 0 ? formatPct(ctr) : '—' },
    { label: 'CPC', value: clicks > 0 ? formatMoneyMicros(cpcMicros, currency) : '—' },
  ]

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="backdrop-in"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.35)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <aside
        className="drawer-in"
        role="dialog"
        aria-modal="true"
        aria-label={`Campaign details: ${name}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: '100vw', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-26px 0 54px -22px rgba(22,25,34,.45)', fontFamily: 'inherit' }}
      >
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #e9ebef' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div title={name} style={{ fontSize: 17, fontWeight: 700, color: '#161922', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {name}
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 10, alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#3b4252' }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      background: '#0866FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#fff',
                    }}
                  >
                    M
                  </span>
                  Meta
                </span>
                <span style={{ fontFamily: monoFont, fontSize: 11, color: '#9aa0aa' }}>{currency}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                flex: 'none',
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                color: '#6b727f',
                borderRadius: 8,
                fontSize: 17,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#0f1118', border: '1px solid #1d2030', borderRadius: 12, padding: '15px 16px' }}>
            <div style={{ fontFamily: monoFont, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b727f', fontWeight: 600, marginBottom: 12 }}>
              Spend trend · last 14 days
            </div>
            <svg width="100%" height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="bCampG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={geo.areaPath} fill="url(#bCampG)" />
              <path d={geo.linePath} fill="none" stroke="#5b9bff" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            {metrics.map((m) => (
              <div key={m.label} style={{ border: '1px solid #eef0f2', borderRadius: 11, padding: '13px 14px' }}>
                <div style={{ fontSize: 11, color: '#9aa0aa', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#161922', letterSpacing: '-0.01em', fontFamily: monoFont }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
