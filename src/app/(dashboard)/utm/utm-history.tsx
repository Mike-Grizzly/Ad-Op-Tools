'use client'

import { useState } from 'react'
import type { UtmHistoryRow } from '@/features/utm/queries'

type Props = { history: UtmHistoryRow[] }

export default function UtmHistory({ history }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (history.length === 0) return null

  async function handleCopy(id: string, url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-3">Recent History</h2>
      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-mono text-gray-800">{entry.generated_url}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {entry.source} / {entry.medium} / {entry.campaign}
                {' · '}
                {new Date(entry.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleCopy(entry.id, entry.generated_url)}
              className="shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              {copiedId === entry.id ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
