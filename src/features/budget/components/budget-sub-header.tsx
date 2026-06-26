'use client'

import { useEffect, useRef, useState } from 'react'
import { RANGE_OPTIONS, type RangeKey } from './budget-helpers'

type Props = {
  monoFont: string
  showControls: boolean
  rangeKey: RangeKey
  rangeLabel: string
  lastSyncedLabel: string
  syncing: boolean
  onRangeChange: (key: RangeKey) => void
  onSync: () => void
}

export function BudgetSubHeader({
  monoFont,
  showControls,
  rangeKey,
  rangeLabel,
  lastSyncedLabel,
  syncing,
  onRangeChange,
  onSync,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointer(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontSize: 12,
            fontWeight: 600,
            color: '#4f46e5',
            marginBottom: 7,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5' }} />
          Spend tracking
        </div>
        <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Budget Dashboard</h2>
        <p style={{ fontSize: 14, color: '#6b727f', margin: 0, maxWidth: 580, lineHeight: 1.5 }}>
          Unified ad spend across every platform — replacing the monthly-cap spreadsheet. Meta is live; Google, LinkedIn
          and TikTok are coming soon.
        </p>
      </div>

      {showControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                fontSize: 13,
                fontWeight: 600,
                color: '#161922',
                background: '#fff',
                border: '1px solid #e9ebef',
                borderRadius: 9,
                padding: '9px 13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1.8" y="2.8" width="12.4" height="11.4" rx="2" stroke="#6b727f" strokeWidth="1.4" />
                <line x1="1.8" y1="6" x2="14.2" y2="6" stroke="#6b727f" strokeWidth="1.4" />
                <line x1="5" y1="1.2" x2="5" y2="4" stroke="#6b727f" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="11" y1="1.2" x2="11" y2="4" stroke="#6b727f" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {rangeLabel}
              <span style={{ color: '#9aa0aa', fontSize: 10 }}>▾</span>
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  zIndex: 20,
                  width: 200,
                  background: '#fff',
                  border: '1px solid #e9ebef',
                  borderRadius: 11,
                  boxShadow: '0 16px 40px -12px rgba(22,25,34,.28)',
                  padding: 6,
                  animation: 'fadeUp .16s ease',
                }}
              >
                {RANGE_OPTIONS.map((opt) => {
                  const active = opt.key === rangeKey
                  return (
                    <div
                      key={opt.key}
                      onClick={() => {
                        onRangeChange(opt.key)
                        setMenuOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 11px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#161922',
                        cursor: 'pointer',
                        background: active ? '#f6f7f9' : 'transparent',
                      }}
                    >
                      <span>{opt.label}</span>
                      {active && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✓</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <span style={{ fontFamily: monoFont, fontSize: 11, color: '#9aa0aa', whiteSpace: 'nowrap' }}>
            {lastSyncedLabel}
          </span>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#4f46e5',
              border: 'none',
              borderRadius: 9,
              padding: '9px 14px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.75 : 1,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ display: 'inline-flex', width: 14, height: 14, animation: syncing ? 'spin .8s linear infinite' : undefined }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M14 8a6 6 0 1 1-1.8-4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M14 1.5V5h-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      )}
    </div>
  )
}
