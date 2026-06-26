'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Database } from '@/types/database'
import type { UTMParamsInput } from '../validation'
import { buildPreviewUrl } from '../url'

type UTMHistoryEntry = Database['public']['Tables']['utm_history']['Row']

type Props = {
  entry: UTMHistoryEntry
  onClose: () => void
  onSave: (id: string, params: UTMParamsInput) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
}

type Fields = {
  base_url: string; source: string; medium: string; campaign: string
  content: string; term: string; ad_set: string; creative: string
}

// Order matches the design: utm params first, Base URL last (no utm_ key of its own).
const PARAMS: { key: keyof Fields; label: string; utm: string; required?: boolean; ph: string }[] = [
  { key: 'source', label: 'Source', utm: 'utm_source', required: true, ph: 'newsletter · paid_social · referral' },
  { key: 'medium', label: 'Medium', utm: 'utm_medium', required: true, ph: 'email · cpc · social · organic' },
  { key: 'campaign', label: 'Campaign', utm: 'utm_campaign', required: true, ph: 'campaign name' },
  { key: 'content', label: 'Content', utm: 'utm_content', ph: 'optional' },
  { key: 'term', label: 'Term', utm: 'utm_term', ph: 'optional' },
  { key: 'ad_set', label: 'Ad Set', utm: 'utm_adset', ph: 'optional' },
  { key: 'creative', label: 'Creative', utm: 'utm_creative', ph: 'optional' },
  { key: 'base_url', label: 'Base URL', utm: '', required: true, ph: 'https://example.com/path' },
]

function toFields(e: UTMHistoryEntry): Fields {
  return {
    base_url: e.base_url, source: e.source, medium: e.medium, campaign: e.campaign,
    content: e.content ?? '', term: e.term ?? '', ad_set: e.ad_set ?? '', creative: e.creative ?? '',
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em',
  textTransform: 'uppercase', color: '#9aa0aa', fontWeight: 600,
}

const Spinner = (
  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: 999, display: 'inline-block', animation: 'spin .6s linear infinite' }} />
)

export function UTMDetailDrawer({ entry, onClose, onSave, onDelete }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [fields, setFields] = useState<Fields>(() => toFields(entry))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelEdit = useCallback(() => {
    setFields(toFields(entry))
    setMode('view')
    setError(null)
  }, [entry])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || busy) return
      if (confirmingDelete) setConfirmingDelete(false)
      else if (mode === 'edit') cancelEdit()
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, busy, confirmingDelete, cancelEdit, onClose])

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const livePreview = buildPreviewUrl(
    fields.base_url, fields.source, fields.medium, fields.campaign,
    fields.content, fields.term, fields.ad_set, fields.creative
  )
  const shownUrl = mode === 'edit' ? livePreview : entry.generated_url
  const urlInvalid = !!fields.base_url && !/^https?:\/\//i.test(fields.base_url.trim())
  const missingRequired = !fields.source.trim() || !fields.medium.trim() || !fields.campaign.trim() || !fields.base_url.trim()
  const saveDisabled = busy || urlInvalid || missingRequired

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function handleCopy() {
    if (!shownUrl) return
    navigator.clipboard.writeText(shownUrl).catch(() => {})
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  async function handleSave() {
    if (saveDisabled) return
    const trimmed: Fields = {
      base_url: fields.base_url.trim(), source: fields.source.trim(), medium: fields.medium.trim(),
      campaign: fields.campaign.trim(), content: fields.content.trim(), term: fields.term.trim(),
      ad_set: fields.ad_set.trim(), creative: fields.creative.trim(),
    }
    setBusy(true)
    setError(null)
    const err = await onSave(entry.id, trimmed)
    if (err) { setError(err); setBusy(false); return }
    setMode('view')
    setBusy(false)
  }

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    setError(null)
    const err = await onDelete(entry.id)
    if (err) { setError(err); setBusy(false); setConfirmingDelete(false) }
  }

  return (
    <div
      className="backdrop-in"
      onClick={() => { if (!busy) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.35)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <aside
        className="drawer-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="utm-drawer-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: '100vw', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-26px 0 54px -22px rgba(22,25,34,.45)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #e9ebef' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id="utm-drawer-title" title={entry.campaign} style={{ fontSize: 17, fontWeight: 700, color: '#161922', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{entry.campaign}</div>
              <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: 'rgba(79,70,229,.09)', color: '#4f46e5' }}>{entry.source}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: '#f1f2f4', color: '#5b626e' }}>{entry.medium}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#9aa0aa', marginTop: 11 }}>Created {formatDate(entry.created_at)}</div>
            </div>
            <button type="button" onClick={onClose} title="Close" aria-label="Close" style={{ flex: 'none', width: 32, height: 32, border: 'none', background: 'transparent', color: '#6b727f', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 8px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Tagged URL card */}
          <div style={{ background: '#0f1118', border: '1px solid #1d2030', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b727f', fontWeight: 600 }}>Tagged URL</span>
              <button type="button" onClick={handleCopy} disabled={!shownUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1d2030', color: copied ? '#22c55e' : '#cdd3e0', border: '1px solid #2a2f42', borderRadius: 7, padding: '5px 11px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: copied ? 600 : 500, cursor: shownUrl ? 'pointer' : 'not-allowed' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.75, color: shownUrl ? '#cdd3e0' : '#5b6273', wordBreak: 'break-all' }}>
              {shownUrl || 'Fill in the required fields to build the URL.'}
            </div>
          </div>

          {/* Parameters */}
          <div>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Parameters</div>

            {mode === 'edit' ? (
              <div style={{ animation: 'fadeUp .24s ease' }}>
                {PARAMS.map((p) => {
                  const showWarn = p.key === 'base_url' && urlInvalid
                  return (
                    <div key={p.key} style={{ padding: '12px 0', borderBottom: '1px solid #f1f2f4', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#161922' }}>{p.label}</span>
                        {p.utm && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9aa0aa' }}>{p.utm}</span>}
                      </div>
                      <input
                        value={fields[p.key]}
                        onChange={(e) => set(p.key, e.target.value)}
                        placeholder={p.ph}
                        aria-label={p.label}
                        style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#161922', background: '#fff', border: `1px solid ${showWarn ? '#ef4444' : '#e1e4e9'}`, borderRadius: 9, padding: '9px 11px', outline: 'none' }}
                      />
                      {showWarn && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#c2410c', marginTop: 1 }}>
                          <span style={{ flex: 'none', width: 15, height: 15, borderRadius: 999, background: 'rgba(239,68,68,.13)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>!</span>
                          <span>Include the full protocol, e.g. https://</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                {PARAMS.map((p) => (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '13px 0', borderBottom: '1px solid #f1f2f4' }}>
                    <div style={{ minWidth: 0, flex: 'none' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#161922' }}>{p.label}</div>
                      {p.utm && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#9aa0aa', marginTop: 2 }}>{p.utm}</div>}
                    </div>
                    <div style={{ textAlign: 'right', maxWidth: 240, minWidth: 0 }}>
                      <ViewValue paramKey={p.key} value={entry[p.key]} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analytics (future) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
              <span style={sectionLabel}>Analytics</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, padding: '3px 9px', borderRadius: 999, background: '#f1f2f4', color: '#9aa0aa', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Coming soon</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, opacity: 0.5 }}>
              {([['Clicks', '70%'], ['CTR', '55%'], ['Last seen', '80%']] as const).map(([label, w]) => (
                <div key={label} style={{ border: '1px dashed #e1e4e9', borderRadius: 12, padding: 13, background: '#fafbfc', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#9aa0aa' }}>{label}</span>
                  <div style={{ height: 18, width: w, background: '#eceef1', borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 22px 0', fontSize: 12.5, color: '#dc2626', fontWeight: 600 }}>{error}</div>
        )}

        {/* Footer */}
        {confirmingDelete ? (
          <div style={{ borderTop: '1px solid rgba(239,68,68,.22)', background: 'rgba(239,68,68,.05)', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ fontSize: 13.5, color: '#161922', fontWeight: 600 }}>Delete this URL? <span style={{ fontWeight: 500, color: '#6b727f' }}>This can&apos;t be undone.</span></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={handleDelete} disabled={busy} style={{ flex: 1, background: busy ? '#dc2626' : '#ef4444', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                {busy && Spinner}<span>{busy ? 'Deleting…' : 'Delete'}</span>
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy} style={{ background: '#fff', color: '#4b5563', border: '1px solid #e1e4e9', borderRadius: 9, padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : mode === 'edit' ? (
          <div style={{ borderTop: '1px solid #e9ebef', padding: '14px 22px', display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleSave} disabled={saveDisabled} style={{ flex: 1, background: urlInvalid || missingRequired ? '#a5a3e8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: saveDisabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              {busy && Spinner}<span>{busy ? 'Saving…' : 'Save changes'}</span>
            </button>
            <button type="button" onClick={cancelEdit} disabled={busy} style={{ background: '#fff', color: '#4b5563', border: '1px solid #e1e4e9', borderRadius: 9, padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #e9ebef', padding: '14px 22px', display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => { setFields(toFields(entry)); setMode('edit') }} style={{ flex: 1, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
            <button type="button" onClick={() => setConfirmingDelete(true)} style={{ background: '#fff', color: '#ef4444', border: '1px solid #e9ebef', borderRadius: 9, padding: '12px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </div>
        )}
      </aside>
    </div>
  )
}

function ViewValue({ paramKey, value }: { paramKey: keyof Fields; value: string | null }) {
  if (!value) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#9aa0aa' }}>—</span>
  if (paramKey === 'source') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: 'rgba(79,70,229,.09)', color: '#4f46e5', display: 'inline-block' }}>{value}</span>
  if (paramKey === 'medium') return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: '#f1f2f4', color: '#5b626e', display: 'inline-block' }}>{value}</span>
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#161922', wordBreak: 'break-all' }}>{value}</span>
}
