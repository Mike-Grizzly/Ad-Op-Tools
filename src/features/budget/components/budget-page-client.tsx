'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncBudget, disconnectPlatform, setCaps } from '../actions'
import type { PlatformConnectionPublic, BudgetEntry, BudgetCap } from '../queries'
import type { DateRange } from '@/types/integrations'
import { budgetSans, budgetMono } from './budget-fonts'
import {
  RANGE_OPTIONS,
  computeKpis,
  computePacing,
  spendDelta,
  dailySeries,
  dominantCurrency,
  distinctCurrencies,
  platformTotals,
  campaignRows,
  sumMicros,
  shortDate,
  relativeTime,
  type RangeKey,
} from './budget-helpers'
import { BudgetSubHeader } from './budget-sub-header'
import { BudgetErrorBanner } from './budget-error-banner'
import { BudgetEmptyState } from './budget-empty-state'
import { BudgetKpiRow } from './budget-kpi-row'
import { BudgetSpendChart } from './budget-spend-chart'
import { BudgetPlatformDonut } from './budget-platform-donut'
import { BudgetCapWidget } from './budget-cap-widget'
import { BudgetCampaignTable } from './budget-campaign-table'
import { BudgetConnections } from './budget-connections'
import { BudgetDetailDrawer } from './budget-detail-drawer'

type Props = {
  connections: PlatformConnectionPublic[]
  entries: BudgetEntry[]
  priorEntries: BudgetEntry[]
  monthEntries: BudgetEntry[]
  caps: BudgetCap[]
  range: DateRange
  priorRange: DateRange
  rangeKey: RangeKey
  nowIso: string
}

type Toast = { msg: string; type: 'success' | 'error' }

const CONNECT_HREF = '/api/integrations/meta/connect'

export function BudgetPageClient({ connections, entries, priorEntries, monthEntries, caps, range, priorRange, rangeKey, nowIso }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [savingCaps, setSavingCaps] = useState(false)
  const [busyConnId, setBusyConnId] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const now = useMemo(() => new Date(nowIso), [nowIso])

  const showToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // ── Connection state ──────────────────────────────────────────────────────
  const metaConnection = connections.find((c) => c.platform === 'meta') ?? null
  const hasConnection = connections.length > 0
  const brokenConnection = connections.find((c) => c.status === 'expired' || c.status === 'error') ?? null

  // ── Derived data (memoised; recomputed only when server data changes) ──────
  const currency = useMemo(() => dominantCurrency(entries, 'USD'), [entries])
  const currencyList = useMemo(() => distinctCurrencies(entries), [entries])
  const kpis = useMemo(() => computeKpis(entries, range.from, range.to), [entries, range.from, range.to])
  const pacing = useMemo(() => computePacing(monthEntries, caps, now), [monthEntries, caps, now])
  const delta = useMemo(() => spendDelta(sumMicros(entries), sumMicros(priorEntries)), [entries, priorEntries])
  const series = useMemo(() => dailySeries(entries, range.from, range.to), [entries, range.from, range.to])
  const totals = useMemo(() => platformTotals(entries, connections), [entries, connections])
  const rows = useMemo(() => campaignRows(entries), [entries])

  const hasSpend = entries.length > 0
  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === rangeKey)?.label ?? 'Last 30 days'
  const lastSyncedLabel = metaConnection ? `Synced ${relativeTime(metaConnection.last_synced_at)}` : 'Not synced'
  const priorLabel = `vs ${shortDate(priorRange.from)}–${shortDate(priorRange.to)}`

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRangeChange = useCallback(
    (key: RangeKey) => {
      startTransition(() => {
        router.push(key === '30' ? '/budget' : `/budget?range=${key}`)
      })
    },
    [router]
  )

  const runSync = useCallback(
    async (accountId?: string) => {
      if (syncing) return
      setSyncing(true)
      const fallbackAccount = connections.find((c) => c.platform === 'meta')?.external_account_id ?? null
      setBusyConnId(accountId ?? fallbackAccount)
      const result = await syncBudget({ platform: 'meta', ...(accountId ? { accountId } : {}) })
      setSyncing(false)
      setBusyConnId(null)
      if (result.error || !result.data) {
        showToast(result.error ?? 'Sync failed', 'error')
        return
      }
      const { rowsSynced, failures } = result.data
      showToast(
        failures > 0
          ? `Synced ${rowsSynced} rows · ${failures} account(s) failed`
          : `Synced ${rowsSynced} ${rowsSynced === 1 ? 'row' : 'rows'} from Meta`,
        failures > 0 ? 'error' : 'success'
      )
      router.refresh()
    },
    [syncing, connections, showToast, router]
  )

  const handleSaveCaps = useCallback(
    async (next: { overall: number; meta: number }) => {
      if (savingCaps) return
      setSavingCaps(true)
      const result = await setCaps({
        caps: [
          { scope: 'overall', amount: next.overall },
          { scope: 'meta', amount: next.meta },
        ],
      })
      setSavingCaps(false)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      showToast('Monthly caps saved')
      router.refresh()
    },
    [savingCaps, showToast, router]
  )

  const handleCloseDrawer = useCallback(() => setSelectedCampaign(null), [])

  const handleDisconnect = useCallback(
    async (id: string) => {
      setBusyConnId(id)
      const result = await disconnectPlatform(id)
      setBusyConnId(null)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      showToast('Account disconnected')
      router.refresh()
    },
    [showToast, router]
  )

  const showProgressBar = syncing || isPending

  return (
    <div className={budgetSans.className} style={{ position: 'relative', fontFamily: budgetSans.style.fontFamily }}>
      {/* barflow is not in globals.css; scope the one keyframe this page needs here. */}
      <style>{'@keyframes budgetBarflow{0%{transform:translateX(-100%)}100%{transform:translateX(560%)}}'}</style>

      {showProgressBar && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(79,70,229,.16)', overflow: 'hidden', zIndex: 6 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '18%', background: '#4f46e5', animation: 'budgetBarflow 1.2s ease-in-out infinite' }} />
        </div>
      )}

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 32px 90px' }}>
        {brokenConnection && (
          <BudgetErrorBanner
            status={brokenConnection.status === 'expired' ? 'expired' : 'error'}
            lastSyncedLabel={relativeTime(brokenConnection.last_synced_at)}
            reconnectHref={CONNECT_HREF}
          />
        )}

        <BudgetSubHeader
          monoFont={budgetMono.style.fontFamily}
          showControls={hasConnection}
          rangeKey={rangeKey}
          rangeLabel={rangeLabel}
          lastSyncedLabel={lastSyncedLabel}
          syncing={syncing}
          onRangeChange={handleRangeChange}
          onSync={() => runSync()}
        />

        {!hasConnection ? (
          <BudgetEmptyState monoFont={budgetMono.style.fontFamily} connectHref={CONNECT_HREF} />
        ) : (
          <div>
            {currencyList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: budgetMono.style.fontFamily, fontSize: 11, color: '#9aa0aa', marginBottom: 14 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#cdd1d8' }} />
                Multiple currencies in range ({currencyList.join(', ')}) — totals shown in {currency}.
              </div>
            )}

            <BudgetKpiRow
              monoFont={budgetMono.style.fontFamily}
              currency={currency}
              kpis={kpis}
              pacing={pacing}
              delta={delta}
              priorLabel={priorLabel}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 16 }}>
              <BudgetSpendChart monoFont={budgetMono.style.fontFamily} points={series} currency={currency} />
              <BudgetPlatformDonut monoFont={budgetMono.style.fontFamily} currency={currency} totals={totals} />
            </div>

            <BudgetCapWidget
              monoFont={budgetMono.style.fontFamily}
              currency={currency}
              caps={caps}
              pacing={pacing}
              now={now}
              saving={savingCaps}
              hasSpend={hasSpend}
              onSave={handleSaveCaps}
            />

            <BudgetCampaignTable monoFont={budgetMono.style.fontFamily} rows={rows} onRowClick={setSelectedCampaign} />

            <BudgetConnections
              monoFont={budgetMono.style.fontFamily}
              connections={connections}
              entries={entries}
              reconnectHref={CONNECT_HREF}
              busyId={busyConnId}
              onSync={(accountId) => runSync(accountId)}
              onDisconnect={handleDisconnect}
            />
          </div>
        )}
      </div>

      {selectedCampaign && (
        <BudgetDetailDrawer
          key={selectedCampaign}
          monoFont={budgetMono.style.fontFamily}
          campaignId={selectedCampaign}
          entries={entries}
          nowIso={nowIso}
          onClose={handleCloseDrawer}
        />
      )}

      {toast && (
        <div
          className="toast-in"
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#10121a',
            color: '#fff',
            borderRadius: 11,
            padding: '12px 16px',
            boxShadow: '0 14px 40px -10px rgba(0,0,0,.4)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: toast.type === 'success' ? '#22c55e' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
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
    </div>
  )
}
