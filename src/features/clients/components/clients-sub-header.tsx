'use client'

import { useEffect, useRef, useState } from 'react'
import { CLIENT_SORTS, type ClientSort } from '../constants'
import { SORT_LABELS, primaryBtn } from './clients-helpers'

type Props = {
  showControls: boolean
  sort: ClientSort
  onSortChange: (sort: ClientSort) => void
  onAdd: () => void
}

export function ClientsSubHeader({ showControls, sort, onSortChange, onAdd }: Props) {
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
          Book of business
        </div>
        <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Clients</h2>
        <p style={{ fontSize: 14, color: '#6b727f', margin: 0, maxWidth: 580, lineHeight: 1.5 }}>
          Every client&apos;s monthly budget, cycle-to-date spend and pacing at a glance. Assign ad accounts to a
          client and its spend rolls up automatically.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {showControls && (
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
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6b727f" strokeWidth="1.4" strokeLinecap="round">
                <path d="M3 4.5h10" /><path d="M4.5 8h7" /><path d="M6.5 11.5h3" />
              </svg>
              {SORT_LABELS[sort]}
              <span style={{ color: '#9aa0aa', fontSize: 10 }}>▾</span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Sort clients"
                style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  zIndex: 20,
                  width: 190,
                  background: '#fff',
                  border: '1px solid #e9ebef',
                  borderRadius: 11,
                  boxShadow: '0 16px 40px -12px rgba(22,25,34,.28)',
                  padding: 6,
                  animation: 'fadeUp .16s ease',
                }}
              >
                {CLIENT_SORTS.map((key) => {
                  const active = key === sort
                  return (
                    <div
                      key={key}
                      role="menuitem"
                      tabIndex={0}
                      onClick={() => {
                        onSortChange(key)
                        setMenuOpen(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSortChange(key)
                          setMenuOpen(false)
                        }
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
                      <span>{SORT_LABELS[key]}</span>
                      {active && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✓</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={onAdd} style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 3v10" /><path d="M3 8h10" />
          </svg>
          Add client
        </button>
      </div>
    </div>
  )
}
