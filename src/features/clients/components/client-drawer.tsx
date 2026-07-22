'use client'

import { useEffect, useState } from 'react'
import { formatMoneyMicros } from '@/features/budget/components/budget-helpers'
import type { PlatformConnectionPublic } from '@/features/budget/queries'
import type { Client, ClientPlatform } from '../queries'
import type { ClientPacing } from '../pacing'
import type { CreateClientInput, UpdateClientInput } from '../validation'
import { dollarPrefix, errorHint, fieldLabel, inputWrap, monoInput, mutedHint, parseAmount, pillFor, primaryBtn, sectionLabel, secondaryBtn } from './clients-helpers'
import { ClientBudgetEditor } from './client-budget-editor'
import { ClientAccountsPanel } from './client-accounts-panel'

type CreateProps = {
  mode: 'create'
  busy: boolean
  onClose: () => void
  onCreate: (input: CreateClientInput) => void
}

type DetailProps = {
  mode: 'detail'
  client: Client
  pacing: ClientPacing
  overrides: ClientPlatform[]
  connections: PlatformConnectionPublic[]
  busy: boolean
  onClose: () => void
  onUpdate: (input: UpdateClientInput) => Promise<string | null>
  onDelete: (id: string) => void
  onAssign: (connectionId: string, clientId: string | null) => void
}

type Props = CreateProps | DetailProps

type CreateDraft = { name: string; budget: string; resetDay: string; currency: string }

function DarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b727f', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, fontWeight: 600, color: '#cdd3e0' }}>{value}</div>
    </div>
  )
}

export function ClientDrawer(props: Props) {
  const { busy, onClose } = props
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Lifted from ClientBudgetEditor so Escape/backdrop can unwind the edit layer
  // before closing the drawer (3-layer precedence, matching the UTM drawer).
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [draft, setDraft] = useState<CreateDraft>({ name: '', budget: '', resetDay: '1', currency: 'USD' })

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key !== 'Escape' || busy) return
      if (confirmingDelete) setConfirmingDelete(false)
      else if (budgetEditing) setBudgetEditing(false)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, confirmingDelete, budgetEditing, onClose])

  // Per-field validity, surfaced individually in the form so a disabled Create
  // button is never a mystery. parseAmount tolerates "$5,000"-style input.
  const budgetParsed = parseAmount(draft.budget)
  const budgetInvalid = budgetParsed === 'invalid'
  const resetDayNum = Number(draft.resetDay)
  const resetDayValid = Number.isInteger(resetDayNum) && resetDayNum >= 1 && resetDayNum <= 28
  const currencyValid = /^[A-Za-z]{3}$/.test(draft.currency.trim())
  const createValid = draft.name.trim() !== '' && !budgetInvalid && resetDayValid && currencyValid
  const createDisabled = busy || !createValid

  function handleCreate(): void {
    if (createDisabled || props.mode !== 'create') return
    props.onCreate({
      name: draft.name.trim(),
      monthlyBudget: typeof budgetParsed === 'number' ? budgetParsed : null,
      budgetResetDay: resetDayNum,
      currency: draft.currency.trim().toUpperCase(),
    })
  }

  const pill =
    props.mode === 'detail'
      ? pillFor(
          props.pacing,
          props.connections.some((c) => c.client_id === props.client.id)
        )
      : null

  return (
    <div
      className="backdrop-in"
      onClick={() => {
        if (busy) return
        if (confirmingDelete) setConfirmingDelete(false)
        else if (budgetEditing) setBudgetEditing(false)
        else onClose()
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.35)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <aside
        className="drawer-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-drawer-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: '100vw', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-26px 0 54px -22px rgba(22,25,34,.45)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #e9ebef' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                id="client-drawer-title"
                style={{ fontSize: 17, fontWeight: 700, color: '#161922', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}
              >
                {props.mode === 'create' ? 'Add client' : props.client.name}
              </div>
              {pill && (
                <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: pill.color, background: pill.bg }}>
                  {pill.label}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              aria-label="Close"
              style={{ flex: 'none', width: 32, height: 32, border: 'none', background: 'transparent', color: '#6b727f', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {props.mode === 'create' ? (
            <>
              <div>
                <label style={fieldLabel}>Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Client name"
                  aria-label="Client name"
                  autoFocus
                  style={{ ...monoInput, fontFamily: 'inherit', fontSize: 13.5 }}
                />
              </div>
              <div>
                <label style={fieldLabel}>Monthly budget</label>
                <div style={inputWrap}>
                  <span style={dollarPrefix}>$</span>
                  <input
                    value={draft.budget}
                    onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value }))}
                    inputMode="decimal"
                    placeholder="Optional — leave empty for no budget"
                    aria-label="Monthly budget in dollars"
                    aria-invalid={budgetInvalid}
                    style={{ ...monoInput, paddingLeft: 22, borderColor: budgetInvalid ? '#ef4444' : '#e1e4e9' }}
                  />
                </div>
                {budgetInvalid && <div style={errorHint}>Enter an amount like 5000 or 5,000</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>Budget reset day</label>
                  <input
                    value={draft.resetDay}
                    onChange={(e) => setDraft((d) => ({ ...d, resetDay: e.target.value }))}
                    type="number"
                    min={1}
                    max={28}
                    aria-label="Budget reset day of month"
                    aria-invalid={!resetDayValid}
                    style={{ ...monoInput, borderColor: resetDayValid ? '#e1e4e9' : '#ef4444' }}
                  />
                  <div style={resetDayValid ? mutedHint : errorHint}>
                    {resetDayValid
                      ? 'Day the budget cycle starts — use 1 for calendar months'
                      : 'Whole number, 1–28'}
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>Currency</label>
                  <input
                    value={draft.currency}
                    onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                    maxLength={3}
                    aria-label="Currency (ISO 4217)"
                    aria-invalid={!currencyValid}
                    style={{ ...monoInput, textTransform: 'uppercase', borderColor: currencyValid ? '#e1e4e9' : '#ef4444' }}
                  />
                  {!currencyValid && <div style={errorHint}>3-letter code, e.g. USD</div>}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Pacing summary */}
              <div style={{ background: '#0f1118', border: '1px solid #1d2030', borderRadius: 12, padding: '15px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <DarkStat label="Spend" value={formatMoneyMicros(props.pacing.spendMicros, props.client.currency)} />
                <DarkStat
                  label="Budget"
                  value={props.pacing.budgetMicros != null ? formatMoneyMicros(props.pacing.budgetMicros, props.client.currency) : '—'}
                />
                <DarkStat label="Projected" value={formatMoneyMicros(props.pacing.projectedMicros, props.client.currency)} />
                <DarkStat label="Days left" value={String(props.pacing.window.daysLeft)} />
              </div>

              <ClientBudgetEditor
                client={props.client}
                overrides={props.overrides}
                busy={busy}
                editing={budgetEditing}
                onEditingChange={setBudgetEditing}
                onSave={props.onUpdate}
              />

              <ClientAccountsPanel clientId={props.client.id} connections={props.connections} busy={busy} onAssign={props.onAssign} />

              {/* Danger zone */}
              <div>
                <div style={{ ...sectionLabel, marginBottom: 10 }}>Danger zone</div>
                {confirmingDelete ? (
                  <div style={{ background: '#fef2f2', borderRadius: 10, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div style={{ fontSize: 13, color: '#161922', fontWeight: 600 }}>
                      Delete this client?{' '}
                      <span style={{ fontWeight: 500, color: '#6b727f' }}>Its ad accounts are unassigned; spend history is kept.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => props.onDelete(props.client.id)}
                        disabled={busy}
                        style={{ ...primaryBtn, background: '#dc2626', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.75 : 1 }}
                      >
                        {busy ? 'Deleting…' : 'Confirm'}
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy} style={secondaryBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    style={{ background: 'transparent', border: 'none', padding: 0, color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Delete client
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e9ebef', padding: '14px 22px', display: 'flex', gap: 10 }}>
          {props.mode === 'create' ? (
            <>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createDisabled}
                style={{ ...primaryBtn, flex: 1, padding: '12px 16px', fontSize: 14, background: createDisabled ? '#a5a3e8' : '#4f46e5', cursor: createDisabled ? 'not-allowed' : 'pointer' }}
              >
                {busy ? 'Creating…' : 'Create client'}
              </button>
              <button type="button" onClick={onClose} disabled={busy} style={{ ...secondaryBtn, padding: '12px 16px', fontSize: 14 }}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} disabled={busy} style={{ ...secondaryBtn, flex: 1, padding: '12px 16px', fontSize: 14 }}>
              Close
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
