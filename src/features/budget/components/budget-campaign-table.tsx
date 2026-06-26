'use client'

import { useMemo, useState, Fragment } from 'react'
import {
  formatMoneyMicros,
  formatInt,
  formatPct,
  platformLabel,
  platformColor,
  platformGlyph,
  type CampaignRow,
} from './budget-helpers'

type SortKey = 'name' | 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc'
type SortDir = 'asc' | 'desc'

type Props = {
  monoFont: string
  rows: CampaignRow[]
  onRowClick: (campaignId: string) => void
}

const PAGE_SIZE = 12
const GRID = '2.6fr .9fr 1fr 1fr .9fr .7fr .7fr'

function compare(a: CampaignRow, b: CampaignRow, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name)
    case 'spend':
      return a.spendMicros - b.spendMicros
    case 'impressions':
      return a.impressions - b.impressions
    case 'clicks':
      return a.clicks - b.clicks
    case 'ctr':
      return a.ctr - b.ctr
    case 'cpc':
      return a.cpcMicros - b.cpcMicros
  }
}

export function BudgetCampaignTable({ monoFont, rows, onRowClick }: Props) {
  const [query, setQuery] = useState('')
  const [grouped, setGrouped] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.campaignId.toLowerCase().includes(q)) : rows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...base].sort((a, b) => compare(a, b, sortKey) * dir)
  }, [rows, query, sortKey, sortDir])

  const limited = filtered.slice(0, visible)
  const hasMore = filtered.length > visible

  const sections = useMemo(() => {
    if (!grouped) return [{ platform: '', rows: limited, subtotal: 0, count: 0, showHeader: false }]
    const byPlatform = new Map<string, CampaignRow[]>()
    for (const r of limited) {
      const list = byPlatform.get(r.platform)
      if (list) list.push(r)
      else byPlatform.set(r.platform, [r])
    }
    return Array.from(byPlatform.entries()).map(([platform, sectionRows]) => ({
      platform,
      rows: sectionRows,
      subtotal: sectionRows.reduce((acc, r) => acc + r.spendMicros, 0),
      count: sectionRows.length,
      showHeader: true,
    }))
  }, [grouped, limited])

  function toggleSort(key: SortKey): void {
    setVisible(PAGE_SIZE)
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  function arrow(key: SortKey): string {
    if (key !== sortKey) return ''
    return sortDir === 'asc' ? '↑' : '↓'
  }

  const headerCellStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b727f' }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Campaign spend</h3>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#5b626e', background: '#f1f2f4', padding: '2px 9px', borderRadius: 999 }}>
            {filtered.length} {filtered.length === 1 ? 'campaign' : 'campaigns'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setGrouped((g) => !g)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#4b5563',
              background: '#fff',
              border: '1px solid #e9ebef',
              borderRadius: 8,
              padding: '7px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ width: 14, height: 14, display: 'inline-flex' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M4 8h10M6 12h8" strokeLinecap="round" />
              </svg>
            </span>
            {grouped ? 'Grouped by platform' : 'Group by platform'}
          </button>
          <div style={{ position: 'relative', width: 230 }}>
            <svg
              width="15"
              height="15"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa0aa', pointerEvents: 'none' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setVisible(PAGE_SIZE)
              }}
              placeholder="Search campaigns…"
              style={{
                width: '100%',
                height: 34,
                padding: '0 12px 0 33px',
                border: '1px solid #e9ebef',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                color: '#161922',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          gap: 8,
          padding: '10px 20px',
          background: '#f3f4f7',
          borderTop: '1px solid #eef0f2',
          borderBottom: '1px solid #eef0f2',
        }}
      >
        <div onClick={() => toggleSort('name')} style={{ ...headerCellStyle, cursor: 'pointer' }}>
          Campaign {arrow('name')}
        </div>
        <div style={headerCellStyle}>Platform</div>
        <div onClick={() => toggleSort('spend')} style={{ ...headerCellStyle, cursor: 'pointer', textAlign: 'right' }}>
          Spend {arrow('spend')}
        </div>
        <div onClick={() => toggleSort('impressions')} style={{ ...headerCellStyle, cursor: 'pointer', textAlign: 'right' }}>
          Impr. {arrow('impressions')}
        </div>
        <div onClick={() => toggleSort('clicks')} style={{ ...headerCellStyle, cursor: 'pointer', textAlign: 'right' }}>
          Clicks {arrow('clicks')}
        </div>
        <div onClick={() => toggleSort('ctr')} style={{ ...headerCellStyle, cursor: 'pointer', textAlign: 'right' }}>
          CTR {arrow('ctr')}
        </div>
        <div onClick={() => toggleSort('cpc')} style={{ ...headerCellStyle, cursor: 'pointer', textAlign: 'right' }}>
          CPC {arrow('cpc')}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#161922', marginBottom: 5 }}>Nothing to show</div>
          <p style={{ fontSize: 13, color: '#9aa0aa', margin: 0 }}>
            {query ? 'No campaigns match your search.' : 'No campaign spend in this range yet.'}
          </p>
        </div>
      )}

      {sections.map((sec) => {
        const isCollapsed = sec.showHeader ? !!collapsed[sec.platform] : false
        return (
          <Fragment key={sec.platform || 'all'}>
            {sec.showHeader && (
              <div
                onClick={() => setCollapsed((prev) => ({ ...prev, [sec.platform]: !prev[sec.platform] }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '9px 20px',
                  background: '#fbfbfc',
                  borderBottom: '1px solid #f1f2f4',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ color: '#9aa0aa', fontSize: 11, width: 10 }}>{isCollapsed ? '▸' : '▾'}</span>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: platformColor(sec.platform),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#fff',
                    }}
                  >
                    {platformGlyph(sec.platform)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#161922' }}>{platformLabel(sec.platform)}</span>
                  <span style={{ fontSize: 11, color: '#9aa0aa' }}>
                    {sec.count} {sec.count === 1 ? 'campaign' : 'campaigns'}
                  </span>
                </div>
                <span style={{ fontFamily: monoFont, fontSize: 12, fontWeight: 600, color: '#161922' }}>
                  {formatMoneyMicros(sec.subtotal, sec.rows[0]?.currency ?? 'USD', { compact: true })}
                </span>
              </div>
            )}
            {!isCollapsed &&
              sec.rows.map((r) => (
                <div
                  key={r.campaignId}
                  onClick={() => onRowClick(r.campaignId)}
                  className="utm-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: GRID,
                    gap: 8,
                    alignItems: 'center',
                    padding: '13px 20px',
                    borderBottom: '1px solid #f1f2f4',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    title={r.name}
                    style={{ fontSize: 13.5, fontWeight: 600, color: '#161922', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}
                  >
                    {r.name}
                  </div>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#3b4252' }}>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 5,
                          background: platformColor(r.platform),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 800,
                          color: '#fff',
                        }}
                      >
                        {platformGlyph(r.platform)}
                      </span>
                      {platformLabel(r.platform)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: monoFont, fontSize: 12.5, fontWeight: 600, color: '#161922' }}>
                    {formatMoneyMicros(r.spendMicros, r.currency)}
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: monoFont, fontSize: 12, color: '#5b626e' }}>{formatInt(r.impressions)}</div>
                  <div style={{ textAlign: 'right', fontFamily: monoFont, fontSize: 12, color: '#5b626e' }}>{formatInt(r.clicks)}</div>
                  <div style={{ textAlign: 'right', fontFamily: monoFont, fontSize: 12, color: '#5b626e' }}>{r.impressions > 0 ? formatPct(r.ctr) : '—'}</div>
                  <div style={{ textAlign: 'right', fontFamily: monoFont, fontSize: 12, color: '#5b626e' }}>
                    {r.clicks > 0 ? formatMoneyMicros(r.cpcMicros, r.currency) : '—'}
                  </div>
                </div>
              ))}
          </Fragment>
        )
      })}

      {hasMore && (
        <div style={{ padding: '13px 20px', textAlign: 'center', borderTop: '1px solid #f1f2f4' }}>
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            style={{
              border: '1px solid #e9ebef',
              background: '#fff',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              color: '#4b5563',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Load more campaigns
          </button>
        </div>
      )}
    </div>
  )
}
