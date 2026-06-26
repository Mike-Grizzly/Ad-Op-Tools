'use client'

import { useState, useRef, useCallback } from 'react'
import type { Database } from '@/types/database'
import { UTM_SOURCES, UTM_MEDIUMS } from '../constants'
import { buildPreviewUrl } from '../url'

type UTMTemplate = Database['public']['Tables']['utm_templates']['Row']
type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string }

type Props = {
  templates: UTMTemplate[]
  onGenerated: (entry: Database['public']['Tables']['utm_history']['Row']) => void
  onTemplateSaved: (template: UTMTemplate) => void
  onCopy: (url: string) => void
  generateAction: (input: unknown) => Promise<ActionResult<{ generated_url: string }>>
  saveTemplateAction: (input: unknown) => Promise<ActionResult<{ id: string }>>
  autocompleteAction: (field: unknown, prefix: unknown) => Promise<ActionResult<string[]>>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e1e4e9',
  borderRadius: 9, fontSize: 14, fontFamily: 'var(--font-mono)',
  color: '#161922', background: '#fff', outline: 'none',
}

type ComboboxProps = {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: readonly { value: string; label: string }[]
}

function Combobox({ value, onChange, placeholder, options }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 130)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 34 }}
      />
      <svg width="15" height="15" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9aa0aa' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 5px)', left: 0, right: 0, background: '#fff', border: '1px solid #e1e4e9', borderRadius: 11, boxShadow: '0 12px 30px -8px rgba(22,25,34,.22)', padding: 5, maxHeight: 210, overflow: 'auto' }}>
          {options.map((opt) => (
            <button key={opt.value} type="button" onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false) }} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 10px', borderRadius: 7, fontSize: 13.5, color: '#161922', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              {opt.value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type AutocompleteInputProps = {
  value: string
  onChange: (v: string) => void
  onConfirm: (v: string) => void
  placeholder: string
  fetchSuggestions: (prefix: string) => Promise<string[]>
  extraStyle?: React.CSSProperties
  maxLength?: number
}

function AutocompleteInput({ value, onChange, onConfirm, placeholder, fetchSuggestions, extraStyle, maxLength }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [acIndex, setAcIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = maxLength ? e.target.value.slice(0, maxLength) : e.target.value
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setSuggestions([]); return }
    timerRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(val)
      setSuggestions(results)
      setAcIndex(0)
    }, 200)
  }, [onChange, fetchSuggestions, maxLength])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAcIndex((i) => (i + 1) % suggestions.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAcIndex((i) => (i - 1 + suggestions.length) % suggestions.length) }
    else if (e.key === 'Enter') { e.preventDefault(); onConfirm(suggestions[acIndex] ?? suggestions[0]); setSuggestions([]); setOpen(false) }
    else if (e.key === 'Escape') { setOpen(false); setSuggestions([]) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false) }, 140)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ ...inputStyle, ...extraStyle }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 40, top: 'calc(100% + 5px)', left: 0, right: 0, background: '#fff', border: '1px solid #e9ebef', borderRadius: 10, boxShadow: '0 8px 24px -4px rgba(22,25,34,.12)', padding: 4, overflow: 'hidden' }}>
          <div style={{ padding: '9px 14px 5px', fontSize: 11, fontWeight: 600, color: '#9aa0aa' }}>from your history</div>
          {suggestions.map((sug, i) => (
            <button
              key={sug}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onConfirm(sug); setSuggestions([]); setOpen(false) }}
              onMouseEnter={() => setAcIndex(i)}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', height: 36, padding: '0 14px', borderRadius: 7, fontSize: 13.5, fontFamily: 'var(--font-mono)', cursor: 'pointer', background: i === acIndex ? 'rgba(79,70,229,.07)' : 'transparent', color: i === acIndex ? '#4f46e5' : '#374151' }}
            >
              {sug}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function UTMForm({ templates, onGenerated, onTemplateSaved, onCopy, generateAction, saveTemplateAction, autocompleteAction }: Props) {
  const [baseUrl, setBaseUrl] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaign, setCampaign] = useState('')
  const [content, setContent] = useState('')
  const [term, setTerm] = useState('')
  const [adSet, setAdSet] = useState('')
  const [creative, setCreative] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const templateNameRef = useRef<HTMLInputElement>(null)

  const generatedUrl = buildPreviewUrl(baseUrl, source, medium, campaign, content, term, adSet, creative)
  const urlInvalid = !!baseUrl && !/^https?:\/\//i.test(baseUrl.trim())

  const fetchCampaignSuggestions = useCallback(async (prefix: string) => {
    const result = await autocompleteAction('campaign', prefix)
    return result.data ?? []
  }, [autocompleteAction])

  const fetchUrlSuggestions = useCallback(async (prefix: string) => {
    const result = await autocompleteAction('base_url', prefix)
    return result.data ?? []
  }, [autocompleteAction])

  function applyTemplate(id: string) {
    setSelectedTemplate(id)
    if (!id) return
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setSource(t.source ?? '')
    setMedium(t.medium ?? '')
    setCampaign(t.campaign ?? '')
    setContent(t.content ?? '')
    setTerm(t.term ?? '')
  }

  async function handleGenerate() {
    if (!generatedUrl || urlInvalid) return
    setGenerating(true)
    try { await navigator.clipboard.writeText(generatedUrl) } catch { /* clipboard unavailable */ }

    const result = await generateAction({
      base_url: baseUrl, source, medium, campaign,
      content: content || undefined, term: term || undefined,
      ad_set: adSet || undefined, creative: creative || undefined,
    })

    if (result.error || !result.data) {
      onCopy('error:' + (result.error ?? 'Failed to generate URL'))
    } else {
      onGenerated({
        id: crypto.randomUUID(), user_id: '', template_id: null,
        base_url: baseUrl, source, medium, campaign,
        content: content || null, term: term || null,
        ad_set: adSet || null, creative: creative || null,
        generated_url: result.data.generated_url,
        created_at: new Date().toISOString(),
      })
      onCopy(result.data.generated_url)
    }
    setGenerating(false)
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    setSavePending(true)
    const result = await saveTemplateAction({
      name: templateName.trim(),
      source: source || undefined, medium: medium || undefined,
      campaign: campaign || undefined, content: content || undefined, term: term || undefined,
    })
    if (result.data) {
      onTemplateSaved({
        id: result.data.id, user_id: '', name: templateName.trim(),
        source: source || null, medium: medium || null, campaign: campaign || null,
        content: content || null, term: term || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      setSavingTemplate(false)
      setTemplateName('')
    }
    setSavePending(false)
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e9ebef', borderRadius: 16, padding: 24, boxShadow: '0 1px 2px rgba(22,25,34,.04)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', letterSpacing: '-0.01em' }}>Build a URL</h3>

      {/* Template picker */}
      <div style={{ marginBottom: 20, padding: '13px 14px', background: '#f7f8fa', border: '1px solid #ebedf1', borderRadius: 11 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" /></svg>
          Load a saved template
        </label>
        <div style={{ position: 'relative' }}>
          <select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value)} style={{ width: '100%', appearance: 'none', padding: '10px 36px 10px 12px', border: '1px solid #e1e4e9', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', fontWeight: 500, color: '#161922', background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">Start from scratch…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <svg width="16" height="16" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9aa0aa' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </div>

      {/* Base URL */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
          Base URL <span style={{ color: '#cdd1d8' }}>·</span> <span style={{ color: '#9aa0aa', fontWeight: 500 }}>the page you&apos;re linking to</span>
        </label>
        <AutocompleteInput value={baseUrl} onChange={setBaseUrl} onConfirm={setBaseUrl} placeholder="https://www.example.com/landing" fetchSuggestions={fetchUrlSuggestions} />
        {urlInvalid && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#c2410c', marginTop: 6, fontWeight: 500 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><path d="M12 16h.01" /></svg>
            Include the full protocol, e.g. https://
          </div>
        )}
      </div>

      {/* Source + Medium */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Source</label>
          <Combobox value={source} onChange={setSource} placeholder="google, meta…" options={UTM_SOURCES} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Medium</label>
          <Combobox value={medium} onChange={setMedium} placeholder="cpc, social…" options={UTM_MEDIUMS} />
        </div>
      </div>

      {/* Ad Set + Creative */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Ad Set <span style={{ color: '#9aa0aa', fontWeight: 500 }}>· optional</span></label>
          <input value={adSet} onChange={(e) => setAdSet(e.target.value)} placeholder="e.g. retargeting-30d" style={{ ...inputStyle, fontFamily: 'inherit' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Creative <span style={{ color: '#9aa0aa', fontWeight: 500 }}>· optional</span></label>
          <input value={creative} onChange={(e) => setCreative(e.target.value)} placeholder="e.g. video-15s-summer" style={{ ...inputStyle, fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Campaign */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>Campaign name</label>
          <span style={{ fontSize: 11.5, color: '#9aa0aa', fontFamily: 'var(--font-mono)' }}>{campaign.length} / 200</span>
        </div>
        <AutocompleteInput value={campaign} onChange={setCampaign} onConfirm={setCampaign} placeholder="spring_launch_2026" fetchSuggestions={fetchCampaignSuggestions} maxLength={200} />
      </div>

      {/* Content + Term */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Content <span style={{ color: '#9aa0aa', fontWeight: 500 }}>· optional</span></label>
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="carousel_a" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Term <span style={{ color: '#9aa0aa', fontWeight: 500 }}>· optional</span></label>
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="running_shoes" style={inputStyle} />
        </div>
      </div>

      {/* Live preview */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>Generated URL</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#5b626e', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />Live preview
          </span>
        </div>
        <div style={{ background: '#0f1118', border: '1px solid #1d2030', borderRadius: 12, padding: 15, fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.75, wordBreak: 'break-all', minHeight: 58, color: generatedUrl ? '#cdd3e0' : '#5b6273' }}>
          {generatedUrl || 'Fill in the fields above — your tagged URL builds here in real time.'}
        </div>
      </div>

      {/* Save template inline form */}
      {savingTemplate && (
        <div style={{ marginBottom: 16, padding: 14, background: '#f7f8fa', border: '1px solid #ebedf1', borderRadius: 11 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Template name</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={templateNameRef} value={templateName} onChange={(e) => setTemplateName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') { setSavingTemplate(false); setTemplateName('') } }} placeholder="e.g. Google Search — Brand" autoFocus style={{ ...inputStyle, flex: 1, fontFamily: 'inherit' }} />
            <button type="button" onClick={handleSaveTemplate} disabled={!templateName.trim() || savePending} style={{ padding: '10px 16px', border: 'none', borderRadius: 9, background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: templateName.trim() && !savePending ? 'pointer' : 'not-allowed', opacity: !templateName.trim() || savePending ? 0.6 : 1 }}>
              {savePending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setSavingTemplate(false); setTemplateName('') }} style={{ padding: '10px 12px', border: '1px solid #e1e4e9', borderRadius: 9, background: '#fff', color: '#4b5563', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 11 }}>
        <button type="button" onClick={handleGenerate} disabled={!generatedUrl || urlInvalid || generating} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, border: 'none', borderRadius: 10, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: !generatedUrl || urlInvalid || generating ? 'not-allowed' : 'pointer', opacity: !generatedUrl || urlInvalid || generating ? 0.6 : 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          {generating ? 'Generating…' : 'Generate & Copy'}
        </button>
        <button type="button" onClick={() => { setSavingTemplate(true); setTimeout(() => templateNameRef.current?.focus(), 50) }} disabled={savingTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 16px', border: '1px solid #e1e4e9', borderRadius: 10, background: '#fff', color: '#4b5563', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: savingTemplate ? 'not-allowed' : 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg>
          Save as Template
        </button>
      </div>
    </section>
  )
}
