'use client'

import type { Database } from '@/types/database'

type UTMHistoryEntry = Database['public']['Tables']['utm_history']['Row']

type Props = {
  entries: UTMHistoryEntry[]
  loading?: boolean
  onCopy: (url: string) => void
}

function SkeletonRow() {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f2f4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div className="shimmer" style={{ height: 13, width: '42%', borderRadius: 6 }} />
        <div className="shimmer" style={{ height: 11, width: 54, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
        <div className="shimmer" style={{ height: 16, width: 54, borderRadius: 5 }} />
        <div className="shimmer" style={{ height: 16, width: 46, borderRadius: 5 }} />
      </div>
      <div className="shimmer" style={{ height: 12, width: '85%', borderRadius: 6, marginTop: 11 }} />
    </div>
  )
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function UTMHistoryTable({ entries, loading = false, onCopy }: Props) {
  const showLoading = loading
  const showEmpty = !loading && entries.length === 0
  const showList = !loading && entries.length > 0
  const visible = entries.slice(0, 20)

  return (
    <section style={{ background: '#fff', border: '1px solid #e9ebef', borderRadius: 16, boxShadow: '0 1px 2px rgba(22,25,34,.04)', display: 'flex', flexDirection: 'column', maxHeight: 760 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #eef0f2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Recent URLs</h3>
          {showList && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#5b626e', background: '#f1f2f4', padding: '2px 8px', borderRadius: 999 }}>
              {entries.length}
            </span>
          )}
        </div>
        <svg width="17" height="17" style={{ color: '#9aa0aa' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 20px' }}>

        {showLoading && (
          <div>
            {[0, 1, 2, 3, 4].map((k) => <SkeletonRow key={k} />)}
          </div>
        )}

        {showEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '56px 24px' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: '#f3f4f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a7adb8', marginBottom: 16 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M15 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#161922', marginBottom: 5 }}>No URLs yet</div>
            <p style={{ fontSize: 13, color: '#8a909b', margin: 0, maxWidth: 240, lineHeight: 1.5 }}>
              Generate your first tagged URL and it will appear here for quick reuse.
            </p>
          </div>
        )}

        {showList && (
          <div>
            {visible.map((entry) => (
              <div key={entry.id} style={{ padding: '14px 0', borderBottom: '1px solid #f1f2f4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#161922', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-mono)' }}>
                    {entry.campaign}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#9aa0aa', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500 }}>
                    {formatDate(entry.created_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#4f46e5', background: 'rgba(79,70,229,.09)', padding: '2px 7px', borderRadius: 5 }}>
                    {entry.source}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#5b626e', background: '#f1f2f4', padding: '2px 7px', borderRadius: 5 }}>
                    {entry.medium}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#8a909b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.generated_url}
                  </span>
                  <button
                    onClick={() => onCopy(entry.generated_url)}
                    title="Copy URL"
                    style={{ flexShrink: 0, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9ebef', background: '#fff', borderRadius: 8, color: '#6b727f', cursor: 'pointer' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showList && (
        <div style={{ padding: '13px 20px', borderTop: '1px solid #eef0f2', textAlign: 'center' }}>
          <button style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#4f46e5', cursor: 'pointer', fontFamily: 'inherit' }}>
            View all {entries.length} URLs →
          </button>
        </div>
      )}
    </section>
  )
}
