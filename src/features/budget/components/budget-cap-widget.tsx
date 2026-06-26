'use client'

import { useState } from 'react'
import { microsToUnits, formatMoneyMicros, formatPct, clampPct, monthName, type Pacing } from './budget-helpers'
import type { BudgetCap as BudgetCapRow } from '../queries'

type CapDraft = { overall: string; meta: string }

type Props = {
  monoFont: string
  currency: string
  caps: BudgetCapRow[]
  pacing: Pacing
  now: Date
  saving: boolean
  hasSpend: boolean
  onSave: (caps: { overall: number; meta: number }) => void
}

const TONE_COLORS: Record<Pacing['tone'], { color: string; bg: string }> = {
  good: { color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
  bad: { color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  neutral: { color: '#6b727f', bg: '#f1f2f4' },
}

function capUnits(caps: BudgetCapRow[], scope: string): number {
  const cap = caps.find((c) => c.scope === scope)
  return cap ? microsToUnits(cap.amount_micros) : 0
}

function draftFromCaps(caps: BudgetCapRow[]): CapDraft {
  const overall = capUnits(caps, 'overall')
  const meta = capUnits(caps, 'meta')
  return { overall: overall > 0 ? String(overall) : '', meta: meta > 0 ? String(meta) : '' }
}

const inputWrap: React.CSSProperties = { position: 'relative' }
const dollarSign: React.CSSProperties = {
  position: 'absolute',
  left: 11,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9aa0aa',
  fontSize: 13,
}

export function BudgetCapWidget({ monoFont, currency, caps, pacing, now, saving, hasSpend, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CapDraft>(() => draftFromCaps(caps))

  const tone = TONE_COLORS[pacing.tone]
  const barColor = pacing.tone === 'bad' ? '#dc2626' : '#4f46e5'
  const metaCapMicros = caps.find((c) => c.scope === 'meta')?.amount_micros ?? 0

  function startEdit(): void {
    setDraft(draftFromCaps(caps))
    setEditing(true)
  }

  function inputStyle(): React.CSSProperties {
    return {
      width: 160,
      padding: '9px 11px 9px 22px',
      border: '1px solid #e1e4e9',
      borderRadius: 9,
      fontSize: 14,
      fontFamily: monoFont,
      color: '#161922',
      outline: 'none',
    }
  }

  function handleSave(): void {
    const overall = Number(draft.overall) || 0
    const meta = Number(draft.meta) || 0
    onSave({ overall, meta })
    setEditing(false)
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 14,
        padding: 20,
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Monthly cap</h3>
          <p style={{ fontSize: 12.5, color: '#9aa0aa', margin: '4px 0 0' }}>
            Set an overall spend ceiling and an optional per-platform limit.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            style={{
              flex: 'none',
              border: '1px solid #e9ebef',
              background: '#fff',
              borderRadius: 9,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#4b5563',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Edit caps
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', animation: 'fadeUp .2s ease' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Overall cap</label>
            <div style={inputWrap}>
              <span style={dollarSign}>$</span>
              <input
                value={draft.overall}
                onChange={(e) => setDraft((d) => ({ ...d, overall: e.target.value }))}
                inputMode="decimal"
                placeholder="0"
                aria-label="Overall monthly cap in dollars"
                style={inputStyle()}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0866FF' }} />
              Meta cap
            </label>
            <div style={inputWrap}>
              <span style={dollarSign}>$</span>
              <input
                value={draft.meta}
                onChange={(e) => setDraft((d) => ({ ...d, meta: e.target.value }))}
                inputMode="decimal"
                placeholder="0"
                aria-label="Meta monthly cap in dollars"
                style={inputStyle()}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              padding: '10px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.75 : 1,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            style={{
              background: '#fff',
              color: '#4b5563',
              border: '1px solid #e1e4e9',
              borderRadius: 9,
              padding: '10px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>
                {formatMoneyMicros(pacing.mtdMicros, currency, { compact: true })}
              </span>
              <span style={{ fontSize: 13, color: '#9aa0aa', fontWeight: 600 }}>
                of {pacing.hasCap ? formatMoneyMicros(pacing.capMicros, currency, { compact: true }) : 'no cap'}
              </span>
            </div>
            <div style={{ position: 'relative', height: 9, background: '#f1f2f4', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: pacing.hasCap ? clampPct(pacing.pctUsed) : '0%',
                  background: barColor,
                  borderRadius: 999,
                }}
              />
            </div>
            {pacing.hasCap && (
              <div style={{ position: 'relative', height: 0 }}>
                <div style={{ position: 'absolute', left: clampPct(pacing.projectedPctOfCap), top: -14, width: 2, height: 14, background: '#161922' }} />
              </div>
            )}
            <div style={{ fontSize: 11.5, color: '#9aa0aa', marginTop: 9 }}>
              {pacing.hasCap ? `${formatPct(pacing.pctUsed)} used · dashed marker = projected EOM` : hasSpend ? 'Set a cap to track pacing' : 'No cap set yet'}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #f1f2f4', paddingLeft: 24 }}>
            <div style={{ fontSize: 11.5, color: '#9aa0aa', marginBottom: 5 }}>Days remaining</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{pacing.daysLeft}</div>
            <div style={{ fontSize: 11.5, color: '#9aa0aa', marginTop: 3 }}>in {monthName(now)}</div>
          </div>
          <div style={{ borderLeft: '1px solid #f1f2f4', paddingLeft: 24 }}>
            <div style={{ fontSize: 11.5, color: '#9aa0aa', marginBottom: 7 }}>Pace signal</div>
            <span style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, color: tone.color, background: tone.bg }}>
              {pacing.label}
            </span>
            <div style={{ fontSize: 11.5, color: '#9aa0aa', marginTop: 8 }}>
              Meta cap {metaCapMicros > 0 ? formatMoneyMicros(metaCapMicros, currency, { compact: true }) : 'not set'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
