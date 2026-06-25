'use client'

import { useState, useCallback } from 'react'
import type { Database } from '@/types/database'
import { UTMForm } from './utm-form'
import { UTMHistoryTable } from './utm-history-table'
import { UTMUrlLibrary } from './utm-url-library'
import { generateAndSaveURL, saveTemplate, getAutocompleteSuggestions } from '../actions'

type UTMTemplate = Database['public']['Tables']['utm_templates']['Row']
type UTMHistoryEntry = Database['public']['Tables']['utm_history']['Row']

type Props = {
  initialTemplates: UTMTemplate[]
  initialHistory: UTMHistoryEntry[]
}

type Toast = { msg: string; type: 'success' | 'error' }

export function UTMPageClient({ initialTemplates, initialHistory }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [entries, setEntries] = useState(initialHistory)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useState<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, type: Toast['type'] = 'success') {
    setToast({ msg, type })
    if (toastTimer[0]) clearTimeout(toastTimer[0])
    toastTimer[1](setTimeout(() => setToast(null), 2600))
  }

  const handleGenerated = useCallback((entry: UTMHistoryEntry) => {
    setEntries((prev) => [entry, ...prev])
    showToast('URL generated & copied to clipboard')
  }, [])

  const handleTemplateSaved = useCallback((template: UTMTemplate) => {
    setTemplates((prev) => [...prev, template].sort((a, b) => a.name.localeCompare(b.name)))
    showToast('Saved as a reusable template')
  }, [])

  const handleCopy = useCallback((urlOrError: string) => {
    if (urlOrError.startsWith('error:')) {
      showToast(urlOrError.replace('error:', ''), 'error')
    }
  }, [])

  return (
    <>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 32px 26px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, fontWeight: 600, color: '#4f46e5', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5' }} />
            Link tagging
          </div>
          <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>UTM Generator</h2>
          <p style={{ fontSize: 14.5, color: '#6b727f', margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
            Build consistent, trackable campaign URLs. Pick a saved template or start fresh, tag your link, and copy it straight into your ad platform.
          </p>
        </div>

        {/* Two-panel grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          <UTMForm
            templates={templates}
            onGenerated={handleGenerated}
            onTemplateSaved={handleTemplateSaved}
            onCopy={handleCopy}
            generateAction={generateAndSaveURL}
            saveTemplateAction={saveTemplate}
            autocompleteAction={getAutocompleteSuggestions}
          />
          <UTMHistoryTable
            entries={entries}
            onCopy={(url) => {
              navigator.clipboard.writeText(url).catch(() => {})
              showToast('URL copied to clipboard')
            }}
          />
        </div>
      </div>

      {/* URL Library — full-width section below the generator */}
      <div style={{ padding: '0 32px 60px' }}>
        <UTMUrlLibrary entries={entries} />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="toast-in"
          style={{ position: 'fixed', top: 18, right: 18, zIndex: 80, display: 'flex', alignItems: 'center', gap: 10, background: '#10121a', color: '#fff', borderRadius: 11, padding: '12px 16px', boxShadow: '0 14px 40px -10px rgba(0,0,0,.4)', fontSize: 13.5, fontWeight: 600 }}
        >
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: toast.type === 'success' ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {toast.type === 'success' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            )}
          </span>
          {toast.msg}
        </div>
      )}
    </>
  )
}
