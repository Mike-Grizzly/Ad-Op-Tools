'use client'

import { useState } from 'react'
import { generateUtm, saveTemplate } from '@/features/utm/actions'
import { UTM_SOURCES, UTM_MEDIUMS } from '@/features/utm/constants'
import type { UtmTemplateRow } from '@/features/utm/queries'

type Props = { templates: UtmTemplateRow[] }

export default function UtmGeneratorForm({ templates }: Props) {
  const [baseUrl, setBaseUrl] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaign, setCampaign] = useState('')
  const [content, setContent] = useState('')
  const [term, setTerm] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  function applyTemplate(template: UtmTemplateRow) {
    if (template.source) setSource(template.source)
    if (template.medium) setMedium(template.medium)
    if (template.campaign) setCampaign(template.campaign)
    if (template.content) setContent(template.content)
    if (template.term) setTerm(template.term)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setGeneratedUrl(null)

    const result = await generateUtm({ base_url: baseUrl, source, medium, campaign, content: content || undefined, term: term || undefined })

    if (!result.data) {
      setError(result.error ?? 'Something went wrong')
      setLoading(false)
      return
    }
    setGeneratedUrl(result.data.url)
    setLoading(false)
  }

  async function handleCopy() {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true)
    setTemplateError(null)
    const result = await saveTemplate({ name: templateName, source: source || undefined, medium: medium || undefined, campaign: campaign || undefined, content: content || undefined, term: term || undefined })
    if (result.error) {
      setTemplateError(result.error)
    } else {
      setTemplateName('')
    }
    setSavingTemplate(false)
  }

  return (
    <div className="space-y-6">
      {templates.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Templates</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL <span className="text-red-500">*</span></label>
          <input
            type="url"
            required
            placeholder="https://example.com/landing"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source <span className="text-red-500">*</span></label>
            <input
              list="utm-sources"
              required
              placeholder="e.g. google"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <datalist id="utm-sources">
              {UTM_SOURCES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medium <span className="text-red-500">*</span></label>
            <input
              list="utm-mediums"
              required
              placeholder="e.g. cpc"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <datalist id="utm-mediums">
              {UTM_MEDIUMS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. summer_sale_2026"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. hero_banner"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. running+shoes"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate URL'}
        </button>
      </form>

      {generatedUrl && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-green-700">Generated URL</p>
          <p className="break-all text-sm text-gray-800 font-mono">{generatedUrl}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Save as template…"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {savingTemplate ? 'Saving…' : 'Save template'}
              </button>
            </div>
          </div>
          {templateError && <p className="text-sm text-red-600">{templateError}</p>}
        </div>
      )}
    </div>
  )
}
