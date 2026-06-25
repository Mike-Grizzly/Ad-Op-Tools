'use client'

import { useState, useRef } from 'react'
import type { Database } from '@/types/database'

type UTMHistoryEntry = Database['public']['Tables']['utm_history']['Row']
type GroupBy = 'all' | 'source' | 'campaign'

type ProcessedRow = {
  id: string
  idFull: string
  idTail: string
  campaign: string
  source: string
  medium: string
  adSet: string
  creative: string
  content: string
  term: string
  baseUrl: string
  fullUrl: string
  tail: string
  bg: string
}

type Section = {
  key: string
  showHeader: boolean
  label: string
  count: string
  expanded: boolean
  rows: ProcessedRow[]
}

function getUtmTail(generatedUrl: string): string {
  const idx = generatedUrl.indexOf('?')
  return idx >= 0 ? generatedUrl.slice(idx) : ''
}

function buildSections(
  entries: UTMHistoryEntry[],
  filter: string,
  groupBy: GroupBy,
  collapsed: Record<string, boolean>
): Section[] {
  const q = filter.trim().toLowerCase()
  const filtered = q
    ? entries.filter((e) =>
        [e.campaign, e.source, e.medium, e.ad_set, e.creative, e.content, e.term, e.base_url]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    : entries

  const mapRow = (e: UTMHistoryEntry, idx: number): ProcessedRow => ({
    id: e.id,
    idFull: e.id + '-full',
    idTail: e.id + '-tail',
    campaign: e.campaign,
    source: e.source,
    medium: e.medium,
    adSet: e.ad_set || '—',
    creative: e.creative || '—',
    content: e.content || '—',
    term: e.term || '—',
    baseUrl: e.base_url,
    fullUrl: e.generated_url,
    tail: getUtmTail(e.generated_url),
    bg: idx % 2 === 1 ? '#fafafa' : '#ffffff',
  })

  if (groupBy === 'all') {
    return [{ key: 'all', showHeader: false, label: '', count: '', expanded: true, rows: filtered.map(mapRow) }]
  }

  const order: string[] = []
  const groups: Record<string, UTMHistoryEntry[]> = {}
  filtered.forEach((e) => {
    const k = groupBy === 'source' ? e.source : e.campaign
    if (!groups[k]) { groups[k] = []; order.push(k) }
    groups[k].push(e)
  })

  let rowIndex = 0
  return order.map((k) => {
    const cl = !!collapsed[k]
    const rows = cl ? [] : groups[k].map((e) => mapRow(e, rowIndex++))
    return {
      key: k,
      showHeader: true,
      label: k,
      count: groups[k].length + (groups[k].length === 1 ? ' URL' : ' URLs'),
      expanded: !cl,
      rows,
    }
  })
}

const COPY_SVG = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
)

const CHECK_SVG = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

type CopyButtonProps = { value: string; id: string; copiedId: string | null; onCopy: (value: string, id: string) => void }

function CopyButton({ value, id, copiedId, onCopy }: CopyButtonProps) {
  const copied = copiedId === id
  return (
    <button
      type="button"
      onClick={() => onCopy(value, id)}
      title={copied ? 'Copied!' : 'Copy'}
      style={{ flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9ebef', background: '#fff', borderRadius: 7, color: copied ? '#22c55e' : '#9aa0aa', cursor: 'pointer' }}
    >
      {copied ? CHECK_SVG : COPY_SVG}
    </button>
  )
}

type GroupToggleProps = { label: string; active: boolean; onClick: () => void }

function GroupToggle({ label, active, onClick }: GroupToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: '6px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', border: active ? 'none' : '1px solid #e9ebef', background: active ? '#4f46e5' : '#fff', color: active ? '#fff' : '#6b727f', borderRadius: 999, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}

type Props = { entries: UTMHistoryEntry[] }

export function UTMUrlLibrary({ entries }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('all')
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy(value: string, id: string) {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopiedId(id)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const sections = buildSections(entries, filter, groupBy, collapsed)
  const totalFiltered = sections.reduce((n, s) => {
    if (!s.showHeader) return n + s.rows.length
    const groupTotal = Object.values(
      entries.reduce<Record<string, number>>((acc, e) => {
        const k = groupBy === 'source' ? e.source : e.campaign
        acc[k] = (acc[k] ?? 0) + 1
        return acc
      }, {})
    ).reduce((a, b) => a + b, 0)
    return groupTotal
  }, 0)
  const isEmpty = sections.every((s) => s.rows.length === 0 && !s.showHeader) || entries.length === 0

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '11px 14px', background: '#f3f4f7',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
    color: '#6b727f', position: 'sticky', top: 0, zIndex: 2,
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e9ebef', borderRadius: 16, boxShadow: '0 1px 2px rgba(22,25,34,.04)', overflow: 'hidden', marginTop: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>URL Library</h3>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#5b626e', background: '#f1f2f4', padding: '2px 9px', borderRadius: 999 }}>{entries.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GroupToggle label="All" active={groupBy === 'all'} onClick={() => setGroupBy('all')} />
            <GroupToggle label="Source" active={groupBy === 'source'} onClick={() => setGroupBy('source')} />
            <GroupToggle label="Campaign" active={groupBy === 'campaign'} onClick={() => setGroupBy('campaign')} />
          </div>
          <div style={{ position: 'relative', width: 260 }}>
            <svg width="16" height="16" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa0aa', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter URLs…" style={{ width: '100%', height: 34, padding: '0 12px 0 34px', border: '1px solid #e9ebef', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#161922', background: '#fff', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderTop: '1px solid #eef0f2' }}>
        <table style={{ width: '100%', minWidth: 1600, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 200 }}>Campaign</th>
              <th style={{ ...thStyle, width: 110 }}>Source</th>
              <th style={{ ...thStyle, width: 110 }}>Medium</th>
              <th style={{ ...thStyle, width: 130 }}>Ad Set</th>
              <th style={{ ...thStyle, width: 150 }}>Creative</th>
              <th style={{ ...thStyle, width: 130 }}>Content</th>
              <th style={{ ...thStyle, width: 110 }}>Term</th>
              <th style={{ ...thStyle, width: 180 }}>Base URL</th>
              <th style={{ ...thStyle, width: 260 }}>Full URL</th>
              <th style={{ ...thStyle, width: 220 }}>UTM Tail</th>
            </tr>
          </thead>
          <tbody>

            {/* Empty state */}
            {isEmpty && (
              <tr>
                <td colSpan={10} style={{ padding: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ width: 54, height: 54, borderRadius: 14, background: '#f3f4f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a7adb8', marginBottom: 16 }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M15 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#161922', marginBottom: 5 }}>No tagged URLs yet</div>
                    <p style={{ fontSize: 13, color: '#9aa0aa', margin: 0, maxWidth: 260, lineHeight: 1.5 }}>Generate your first UTM link and it will appear here.</p>
                  </div>
                </td>
              </tr>
            )}

            {sections.map((sec) => (
              <>
                {/* Group header */}
                {sec.showHeader && (
                  <tr key={sec.key + '-header'} onClick={() => toggleGroup(sec.key)} style={{ cursor: 'pointer', background: '#f3f4f7' }}>
                    <td colSpan={10} style={{ padding: '9px 16px', borderTop: '1px solid #eef0f2', borderBottom: '1px solid #eef0f2' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#161922' }}>{sec.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#5b626e', background: '#fff', border: '1px solid #e9ebef', padding: '1px 8px', borderRadius: 999 }}>{sec.count}</span>
                        </div>
                        <svg width="17" height="17" style={{ color: '#9aa0aa', transform: sec.expanded ? 'none' : 'rotate(180deg)', transition: 'transform .15s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {sec.rows.map((r) => (
                  <tr key={r.id} style={{ height: 48, background: r.bg, borderBottom: '1px solid #f1f2f4' }}>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div title={r.campaign} style={{ fontSize: 13.5, fontWeight: 700, color: '#161922', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.campaign}</div>
                    </td>
                    <td style={{ padding: '0 14px' }}>
                      <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#4f46e5', background: 'rgba(79,70,229,.09)', padding: '2px 7px', borderRadius: 5 }}>{r.source}</span>
                    </td>
                    <td style={{ padding: '0 14px' }}>
                      <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#5b626e', background: '#f1f2f4', padding: '2px 7px', borderRadius: 5 }}>{r.medium}</span>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div title={r.adSet} style={{ fontSize: 12.5, color: '#6b727f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adSet}</div>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div title={r.creative} style={{ fontSize: 12.5, color: '#6b727f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.creative}</div>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div title={r.content} style={{ fontSize: 12.5, color: '#6b727f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</div>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div title={r.term} style={{ fontSize: 12.5, color: '#6b727f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.term}</div>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div title={r.baseUrl} style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: '#9aa0aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.baseUrl}</div>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title={r.fullUrl} style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: '#9aa0aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fullUrl}</span>
                        <CopyButton value={r.fullUrl} id={r.idFull} copiedId={copiedId} onCopy={handleCopy} />
                      </div>
                    </td>
                    <td style={{ padding: '0 14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title={r.tail} style={{ flex: 1, minWidth: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#9aa0aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tail}</span>
                        <CopyButton value={r.tail} id={r.idTail} copiedId={copiedId} onCopy={handleCopy} />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
