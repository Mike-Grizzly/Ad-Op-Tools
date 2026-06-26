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

const PARAMS: { key: keyof Fields; label: string; utm: string; required?: boolean }[] = [
  { key: 'source', label: 'Source', utm: 'utm_source', required: true },
  { key: 'medium', label: 'Medium', utm: 'utm_medium', required: true },
  { key: 'campaign', label: 'Campaign', utm: 'utm_campaign', required: true },
  { key: 'content', label: 'Content', utm: 'utm_content' },
  { key: 'term', label: 'Term', utm: 'utm_term' },
  { key: 'ad_set', label: 'Ad Set', utm: 'utm_adset' },
  { key: 'creative', label: 'Creative', utm: 'utm_creative' },
]

const ANALYTICS_TILES = ['Clicks', 'CTR', 'Last seen']

function toFields(e: UTMHistoryEntry): Fields {
  return {
    base_url: e.base_url, source: e.source, medium: e.medium, campaign: e.campaign,
    content: e.content ?? '', term: e.term ?? '', ad_set: e.ad_set ?? '', creative: e.creative ?? '',
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid #e1e4e9', borderRadius: 9,
  fontSize: 13.5, fontFamily: 'var(--font-mono)', color: '#161922', background: '#fff', outline: 'none',
}

const COPY_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
)
const CHECK_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
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
        style={{ width: 440, maxWidth: '100vw', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-18px 0 50px -20px rgba(0,0,0,.35)' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #eef0f2' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h3 id="utm-drawer-title" title={entry.campaign} style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', margin: 0, color: '#161922', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.campaign}</h3>
              <div style={{ fontSize: 11.5, color: '#9aa0aa', marginTop: 4, fontWeight: 500 }}>Created {formatDate(entry.created_at)}</div>
            </div>
            <button type="button" onClick={onClose} title="Close" aria-label="Close" style={{ flexShrink: 0, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9ebef', background: '#fff', borderRadius: 8, color: '#6b727f', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#4f46e5', background: 'rgba(79,70,229,.09)', padding: '2px 8px', borderRadius: 999 }}>{entry.source}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#5b626e', background: '#f1f2f4', padding: '2px 8px', borderRadius: 999 }}>{entry.medium}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px 20px' }}>
          {/* Tagged URL */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>Tagged URL</span>
              <button type="button" onClick={handleCopy} title="Copy URL" disabled={!shownUrl} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', border: `1px solid ${copied ? '#bbf7d0' : '#e9ebef'}`, background: copied ? '#f0fdf4' : '#fff', borderRadius: 7, color: copied ? '#16a34a' : '#6b727f', cursor: shownUrl ? 'pointer' : 'not-allowed', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit' }}>
                {copied ? CHECK_SVG : COPY_SVG}{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ background: '#0f1118', border: '1px solid #1d2030', borderRadius: 12, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, wordBreak: 'break-all', color: shownUrl ? '#cdd3e0' : '#5b6273', minHeight: 50 }}>
              {shownUrl || 'Fill in the required fields to build the URL.'}
            </div>
            {mode === 'edit' && urlInvalid && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#c2410c', marginTop: 7, fontWeight: 500 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><path d="M12 16h.01" /></svg>
                Include the full protocol, e.g. https://
              </div>
            )}
          </div>

          {/* Parameters */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9aa0aa', marginBottom: 10 }}>Parameters</div>

          {/* Base URL row */}
          <ParamRow label="Base URL" hint="destination" mode={mode}>
            {mode === 'edit'
              ? <input value={fields.base_url} onChange={(e) => set('base_url', e.target.value)} placeholder="https://example.com/landing" aria-label="Base URL" style={inputStyle} />
              : <ValueText value={entry.base_url} mono />}
          </ParamRow>

          {PARAMS.map((p) => (
            <ParamRow key={p.key} label={p.label} hint={p.utm} mode={mode} required={p.required}>
              {mode === 'edit'
                ? <input value={fields[p.key]} onChange={(e) => set(p.key, e.target.value)} placeholder={p.required ? 'Required' : 'Optional'} aria-label={p.label} style={inputStyle} />
                : <ValueText value={entry[p.key]} mono />}
            </ParamRow>
          ))}

          {/* Analytics placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 10px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9aa0aa' }}>Analytics</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa0aa', background: '#f1f2f4', padding: '2px 7px', borderRadius: 999 }}>Coming soon</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, opacity: 0.55 }}>
            {ANALYTICS_TILES.map((t) => (
              <div key={t} style={{ background: '#f7f8fa', border: '1px solid #eef0f2', borderRadius: 10, padding: '12px 10px' }}>
                <div style={{ fontSize: 11, color: '#9aa0aa', fontWeight: 600, marginBottom: 6 }}>{t}</div>
                <div className="shimmer" style={{ height: 14, width: '60%', borderRadius: 5 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #eef0f2', padding: '14px 20px' }}>
          {error && (
            <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 600, marginBottom: 10 }}>{error}</div>
          )}
          {confirmingDelete ? (
            <div>
              <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500, marginBottom: 11 }}>Delete this URL? This can&apos;t be undone.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={handleDelete} disabled={busy} style={{ flex: 1, padding: 11, border: 'none', borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy} style={{ padding: '11px 18px', border: '1px solid #e1e4e9', borderRadius: 10, background: '#fff', color: '#4b5563', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : mode === 'edit' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={handleSave} disabled={saveDisabled} style={{ flex: 1, padding: 11, border: 'none', borderRadius: 10, background: '#4f46e5', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: saveDisabled ? 'not-allowed' : 'pointer', opacity: saveDisabled ? 0.6 : 1 }}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit} disabled={busy} style={{ padding: '11px 18px', border: '1px solid #e1e4e9', borderRadius: 10, background: '#fff', color: '#4b5563', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => { setFields(toFields(entry)); setMode('edit') }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, border: 'none', borderRadius: 10, background: '#4f46e5', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                Edit
              </button>
              <button type="button" onClick={() => setConfirmingDelete(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 18px', border: '1px solid #f3d1d1', borderRadius: 10, background: '#fff', color: '#dc2626', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function ParamRow({ label, hint, mode, required, children }: { label: string; hint: string; mode: 'view' | 'edit'; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #f4f5f7' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: mode === 'edit' ? 7 : 4 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>{label}</span>
        {required && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>•</span>}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#a7adb8' }}>{hint}</span>
      </div>
      {children}
    </div>
  )
}

function ValueText({ value, mono }: { value: string | null; mono?: boolean }) {
  const empty = !value
  return (
    <div style={{ fontSize: 13, fontFamily: mono ? 'var(--font-mono)' : 'inherit', color: empty ? '#c4c9d0' : '#161922', wordBreak: 'break-all' }}>
      {value || '—'}
    </div>
  )
}
