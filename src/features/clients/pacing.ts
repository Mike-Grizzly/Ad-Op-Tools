// Pure pacing math for the clients book-of-business. No React, no DB imports — the
// future digest/email job imports this directly. Dates are UTC throughout; entry dates
// are ISO YYYY-MM-DD strings compared lexically (safe for ISO).
//
// Band thresholds resolve a product-spec inconsistency (decision-log 2026-07-21): with
// linear projection, "projected > budget" is equivalent to any positive deviation, so
// red is instead ">25% off ideal pace, or budget already exhausted".

export type BillingWindow = {
  from: string
  to: string
  dayOfCycle: number
  daysInCycle: number
  daysLeft: number
}

export type SpendEntry = {
  entry_date: string
  spend_micros: number
  platform: string
  currency: string
}

export type PacingStatus = 'green' | 'yellow' | 'red' | 'none'

export type PlatformPacing = {
  platform: string
  spendMicros: number
  budgetMicros: number | null
  status: PacingStatus
}

export type ClientPacing = {
  window: BillingWindow
  budgetMicros: number | null
  spendMicros: number
  idealMicros: number
  projectedMicros: number
  deviation: number | null
  pctUsed: number | null
  status: PacingStatus
  perPlatform: PlatformPacing[]
  trend: { pct: number; up: boolean } | null
}

const DAY_MS = 86_400_000

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

// The billing cycle containing `now`: starts on the most recent resetDay (this month if
// today's date >= resetDay, else last month) and ends the day before the next resetDay.
// resetDay is constrained to 1..28 by the DB, so every month has the start day.
export function billingWindow(resetDay: number, now: Date): BillingWindow {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const startMonthOffset = now.getUTCDate() >= resetDay ? 0 : -1
  const startMs = Date.UTC(year, month + startMonthOffset, resetDay)
  const nextResetMs = Date.UTC(year, month + startMonthOffset + 1, resetDay)
  const endMs = nextResetMs - DAY_MS
  const todayMs = Date.UTC(year, month, now.getUTCDate())

  const daysInCycle = Math.round((nextResetMs - startMs) / DAY_MS)
  const dayOfCycle = Math.round((todayMs - startMs) / DAY_MS) + 1

  return {
    from: isoDate(startMs),
    to: isoDate(endMs),
    dayOfCycle,
    daysInCycle,
    daysLeft: daysInCycle - dayOfCycle,
  }
}

// A budget must be a positive amount to pace against; null or 0 renders neutral.
function bandStatus(spendMicros: number, budgetMicros: number | null, ideal: number): PacingStatus {
  if (budgetMicros == null || budgetMicros <= 0) return 'none'
  if (spendMicros >= budgetMicros) return 'red'
  const deviation = (spendMicros - ideal) / ideal
  const abs = Math.abs(deviation)
  if (abs <= 0.1) return 'green'
  if (abs <= 0.25) return 'yellow'
  return 'red'
}

// Spend in the 7 days ending today vs the prior 7 days. Null when the prior window has
// no spend (no meaningful comparison).
export function weeklyTrend(
  entries: SpendEntry[],
  now: Date
): { pct: number; up: boolean } | null {
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const lastFrom = isoDate(todayMs - 6 * DAY_MS)
  const today = isoDate(todayMs)
  const priorFrom = isoDate(todayMs - 13 * DAY_MS)
  const priorTo = isoDate(todayMs - 7 * DAY_MS)

  let last = 0
  let prior = 0
  for (const e of entries) {
    if (e.entry_date >= lastFrom && e.entry_date <= today) last += e.spend_micros
    else if (e.entry_date >= priorFrom && e.entry_date <= priorTo) prior += e.spend_micros
  }
  if (prior === 0) return null
  return { pct: (last - prior) / prior, up: last >= prior }
}

// Entries attributable to a client: those from ad accounts assigned to it, joined on
// the (platform, external_account_id) pair.
export function entriesForClient<E extends SpendEntry & { external_account_id: string }>(
  entries: E[],
  connections: { platform: string; external_account_id: string; client_id: string | null }[],
  clientId: string
): E[] {
  const keys = new Set(
    connections
      .filter((c) => c.client_id === clientId)
      .map((c) => `${c.platform} ${c.external_account_id}`)
  )
  if (keys.size === 0) return []
  return entries.filter((e) => keys.has(`${e.platform} ${e.external_account_id}`))
}

export function computeClientPacing(
  entries: SpendEntry[],
  client: { monthly_budget_micros: number | null; budget_reset_day: number },
  overrides: { platform: string; monthly_budget_override_micros: number }[],
  now: Date
): ClientPacing {
  const window = billingWindow(client.budget_reset_day, now)
  const inWindow = entries.filter(
    (e) => e.entry_date >= window.from && e.entry_date <= window.to
  )

  const spendMicros = inWindow.reduce((sum, e) => sum + e.spend_micros, 0)
  const budgetMicros = client.monthly_budget_micros
  const hasBudget = budgetMicros != null && budgetMicros > 0
  const idealMicros = hasBudget
    ? Math.round(budgetMicros * (window.dayOfCycle / window.daysInCycle))
    : 0
  const projectedMicros = Math.round((spendMicros / window.dayOfCycle) * window.daysInCycle)
  const deviation = hasBudget && idealMicros > 0 ? (spendMicros - idealMicros) / idealMicros : null
  const pctUsed = hasBudget ? spendMicros / budgetMicros : null

  const overrideByPlatform = new Map(
    overrides.map((o) => [o.platform, o.monthly_budget_override_micros])
  )
  const spendByPlatform = new Map<string, number>()
  for (const e of inWindow) {
    spendByPlatform.set(e.platform, (spendByPlatform.get(e.platform) ?? 0) + e.spend_micros)
  }
  const platforms = new Set([...overrideByPlatform.keys(), ...spendByPlatform.keys()])
  const perPlatform: PlatformPacing[] = [...platforms].sort().map((platform) => {
    const platformSpend = spendByPlatform.get(platform) ?? 0
    const platformBudget = overrideByPlatform.get(platform) ?? null
    const platformIdeal =
      platformBudget != null && platformBudget > 0
        ? Math.round(platformBudget * (window.dayOfCycle / window.daysInCycle))
        : 0
    return {
      platform,
      spendMicros: platformSpend,
      budgetMicros: platformBudget,
      status: bandStatus(platformSpend, platformBudget, platformIdeal),
    }
  })

  return {
    window,
    budgetMicros,
    spendMicros,
    idealMicros,
    projectedMicros,
    deviation,
    pctUsed,
    status: bandStatus(spendMicros, hasBudget ? budgetMicros : null, idealMicros),
    perPlatform,
    trend: weeklyTrend(entries, now),
  }
}
