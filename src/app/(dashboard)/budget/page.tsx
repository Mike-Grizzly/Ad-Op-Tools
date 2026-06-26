import { getConnections, getBudgetEntries, getCaps } from '@/features/budget/queries'
import { BudgetPageClient } from '@/features/budget/components/budget-page-client'
import { RANGE_OPTIONS, type RangeKey } from '@/features/budget/components/budget-helpers'
import type { DateRange } from '@/types/integrations'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function resolveRangeKey(value: string | undefined): RangeKey {
  return RANGE_OPTIONS.some((o) => o.key === value) ? (value as RangeKey) : '30'
}

function rangeForKey(key: RangeKey, now: Date): { range: DateRange; days: number } {
  if (key === 'mtd') {
    const from = isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
    const to = isoDate(now)
    return { range: { from, to }, days: now.getUTCDate() }
  }
  const days = RANGE_OPTIONS.find((o) => o.key === key)?.days ?? 30
  const to = isoDate(now)
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - (days - 1))
  return { range: { from: isoDate(from), to }, days }
}

// The immediately-preceding window of equal length, for the period-over-period delta.
function priorRange(range: DateRange, days: number): DateRange {
  const priorTo = new Date(`${range.from}T00:00:00Z`)
  priorTo.setUTCDate(priorTo.getUTCDate() - 1)
  const priorFrom = new Date(priorTo)
  priorFrom.setUTCDate(priorFrom.getUTCDate() - (days - 1))
  return { from: isoDate(priorFrom), to: isoDate(priorTo) }
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const now = new Date()
  const rangeKey = resolveRangeKey(rangeParam)
  const { range, days } = rangeForKey(rangeKey, now)
  const prior = priorRange(range, days)

  // Pacing always reflects the current calendar month, independent of the selected range.
  const monthStart = isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
  const mtdRange: DateRange = { from: monthStart, to: isoDate(now) }

  const [connections, entries, priorEntries, monthEntries, caps] = await Promise.all([
    getConnections(),
    getBudgetEntries(range),
    getBudgetEntries(prior),
    getBudgetEntries(mtdRange),
    getCaps(),
  ])

  return (
    <BudgetPageClient
      connections={connections}
      entries={entries}
      priorEntries={priorEntries}
      monthEntries={monthEntries}
      caps={caps}
      range={range}
      priorRange={prior}
      rangeKey={rangeKey}
      nowIso={now.toISOString()}
    />
  )
}
