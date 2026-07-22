'use client'

import { useState } from 'react'
import { AD_PLATFORMS, type AdPlatform } from '@/types/integrations'
import { formatMoneyMicros, microsToUnits } from '@/features/budget/components/budget-helpers'
import { platformColor, platformGlyph, platformLabel } from '@/lib/platform-meta'
import type { Client, ClientPlatform } from '../queries'
import type { UpdateClientInput } from '../validation'
import { dollarPrefix, errorHint, fieldLabel, inputWrap, monoInput, mutedHint, parseAmount, primaryBtn, secondaryBtn, smallSecondaryBtn } from './clients-helpers'

type Props = {
  client: Client
  overrides: ClientPlatform[]
  busy: boolean
  // Controlled by the drawer so Escape/backdrop can unwind the edit layer first.
  editing: boolean
  onEditingChange: (editing: boolean) => void
  // Resolves the error string or null; the editor only leaves edit mode on success,
  // keeping the user's draft intact on failure.
  onSave: (input: UpdateClientInput) => Promise<string | null>
}

type Draft = { budget: string; resetDay: string; platforms: Record<AdPlatform, string> }

function draftFrom(client: Client, overrides: ClientPlatform[]): Draft {
  const platforms = Object.fromEntries(AD_PLATFORMS.map((p) => [p, ''])) as Record<AdPlatform, string>
  for (const o of overrides) {
    if ((AD_PLATFORMS as readonly string[]).includes(o.platform)) {
      platforms[o.platform as AdPlatform] = String(microsToUnits(o.monthly_budget_override_micros))
    }
  }
  return {
    budget: client.monthly_budget_micros != null ? String(microsToUnits(client.monthly_budget_micros)) : '',
    resetDay: String(client.budget_reset_day),
    platforms,
  }
}

const amountInput = { ...monoInput, paddingLeft: 22 }

export function ClientBudgetEditor({ client, overrides, busy, editing, onEditingChange, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(client, overrides))

  const resetDayNum = Number(draft.resetDay)
  const resetDayValid = Number.isInteger(resetDayNum) && resetDayNum >= 1 && resetDayNum <= 28
  const budgetParsed = parseAmount(draft.budget)
  const budgetInvalid = budgetParsed === 'invalid'
  const overrideInvalid = Object.fromEntries(
    AD_PLATFORMS.map((p) => [p, parseAmount(draft.platforms[p]) === 'invalid'])
  ) as Record<AdPlatform, boolean>
  const amountsValid = !budgetInvalid && AD_PLATFORMS.every((p) => !overrideInvalid[p])
  const saveDisabled = busy || saving || !resetDayValid || !amountsValid

  async function handleSave(): Promise<void> {
    if (saveDisabled) return
    setSaving(true)
    const error = await onSave({
      id: client.id,
      monthlyBudget: typeof budgetParsed === 'number' ? budgetParsed : null,
      budgetResetDay: resetDayNum,
      overrides: AD_PLATFORMS.map((p) => ({ platform: p, parsed: parseAmount(draft.platforms[p]) }))
        .filter((o): o is { platform: AdPlatform; parsed: number } => typeof o.parsed === 'number')
        .map((o) => ({ platform: o.platform, amount: o.parsed })),
    })
    setSaving(false)
    if (error == null) onEditingChange(false)
  }

  return (
    <div style={{ border: '1px solid #e9ebef', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Monthly budget</h3>
          <p style={{ fontSize: 12.5, color: '#9aa0aa', margin: '4px 0 0' }}>Total budget with optional per-platform overrides.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(draftFrom(client, overrides))
              onEditingChange(true)
            }}
            style={smallSecondaryBtn}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ animation: 'fadeUp .2s ease', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>Total budget</label>
              <div style={inputWrap}>
                <span style={dollarPrefix}>$</span>
                <input
                  value={draft.budget}
                  onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value }))}
                  inputMode="decimal"
                  placeholder="No budget"
                  aria-label="Total monthly budget in dollars"
                  aria-invalid={budgetInvalid}
                  style={{ ...amountInput, borderColor: budgetInvalid ? '#ef4444' : '#e1e4e9' }}
                />
              </div>
              {budgetInvalid && <div style={errorHint}>Enter an amount like 5000 or 5,000</div>}
            </div>
            <div>
              <label style={fieldLabel}>Budget reset day</label>
              <input
                value={draft.resetDay}
                onChange={(e) => setDraft((d) => ({ ...d, resetDay: e.target.value }))}
                type="number"
                min={1}
                max={28}
                aria-label="Budget reset day of month"
                style={{ ...monoInput, borderColor: resetDayValid ? '#e1e4e9' : '#ef4444' }}
              />
              <div style={resetDayValid ? mutedHint : errorHint}>
                {resetDayValid ? 'Day the budget cycle starts — use 1 for calendar months' : 'Whole number, 1–28'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#161922' }}>Per-platform budgets (optional)</div>
            <p style={{ fontSize: 12, color: '#9aa0aa', margin: '3px 0 0' }}>
              Cap spend per platform within the total — e.g. $3,000 of a $5,000 budget for Meta.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {AD_PLATFORMS.map((p) => (
              <div key={p}>
                <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: platformColor(p) }} />
                  {platformLabel(p)}
                </label>
                <div style={inputWrap}>
                  <span style={dollarPrefix}>$</span>
                  <input
                    value={draft.platforms[p]}
                    onChange={(e) => setDraft((d) => ({ ...d, platforms: { ...d.platforms, [p]: e.target.value } }))}
                    inputMode="decimal"
                    placeholder="No override"
                    aria-label={`${platformLabel(p)} monthly budget override in dollars`}
                    aria-invalid={overrideInvalid[p]}
                    style={{ ...amountInput, borderColor: overrideInvalid[p] ? '#ef4444' : '#e1e4e9' }}
                  />
                </div>
                {overrideInvalid[p] && <div style={errorHint}>Amount like 5000 or 5,000</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
              style={{ ...primaryBtn, cursor: saveDisabled ? 'not-allowed' : 'pointer', opacity: saveDisabled ? 0.75 : 1 }}
            >
              {saving || busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => onEditingChange(false)} disabled={saving || busy} style={secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11.5, color: '#9aa0aa', marginBottom: 4 }}>Monthly budget</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
                {client.monthly_budget_micros != null
                  ? formatMoneyMicros(client.monthly_budget_micros, client.currency)
                  : 'Not set'}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #f1f2f4', paddingLeft: 16 }}>
              <div style={{ fontSize: 11.5, color: '#9aa0aa', marginBottom: 4 }}>Reset day</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>Day {client.budget_reset_day}</div>
            </div>
          </div>
          {overrides.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {overrides.map((o) => (
                <div
                  key={o.platform}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid #f1f2f4' }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      background: platformColor(o.platform),
                      color: '#fff',
                      fontSize: 8,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    {platformGlyph(o.platform)}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563', flex: 1 }}>{platformLabel(o.platform)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#161922' }}>
                    {formatMoneyMicros(o.monthly_budget_override_micros, client.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
