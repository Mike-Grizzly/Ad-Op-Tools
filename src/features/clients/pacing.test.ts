import { describe, it, expect } from 'vitest'
import {
  billingWindow,
  computeClientPacing,
  entriesForClient,
  weeklyTrend,
  type SpendEntry,
} from './pacing'

function entry(
  entry_date: string,
  spend_micros: number,
  platform = 'meta',
  currency = 'USD'
): SpendEntry {
  return { entry_date, spend_micros, platform, currency }
}

const at = (iso: string): Date => new Date(iso)

describe('billingWindow', () => {
  it('reset day 1 is the calendar month (budget-page parity)', () => {
    const w = billingWindow(1, at('2026-07-21T12:00:00Z'))
    expect(w).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
      dayOfCycle: 21,
      daysInCycle: 31,
      daysLeft: 10,
    })
  })

  it('starts this month when today is on/after the reset day', () => {
    const w = billingWindow(15, at('2026-07-21T00:00:00Z'))
    expect(w.from).toBe('2026-07-15')
    expect(w.to).toBe('2026-08-14')
    expect(w.dayOfCycle).toBe(7)
    expect(w.daysInCycle).toBe(31)
  })

  it('starts last month when today is before the reset day', () => {
    const w = billingWindow(15, at('2026-07-10T23:59:59Z'))
    expect(w.from).toBe('2026-06-15')
    expect(w.to).toBe('2026-07-14')
    expect(w.dayOfCycle).toBe(26)
    expect(w.daysInCycle).toBe(30)
  })

  it('crosses the year boundary', () => {
    const w = billingWindow(15, at('2026-01-05T00:00:00Z'))
    expect(w.from).toBe('2025-12-15')
    expect(w.to).toBe('2026-01-14')
    expect(w.daysInCycle).toBe(31)
    expect(w.dayOfCycle).toBe(22)
  })

  it('handles reset day 28 across February in a leap year', () => {
    const w = billingWindow(28, at('2028-02-28T00:00:00Z'))
    expect(w.from).toBe('2028-02-28')
    expect(w.to).toBe('2028-03-27')
    expect(w.daysInCycle).toBe(29)
    expect(w.dayOfCycle).toBe(1)
  })

  it('keeps dayOfCycle + daysLeft = daysInCycle on the last day of a cycle', () => {
    const w = billingWindow(28, at('2026-02-27T00:00:00Z'))
    expect(w.from).toBe('2026-01-28')
    expect(w.to).toBe('2026-02-27')
    expect(w.dayOfCycle).toBe(w.daysInCycle)
    expect(w.daysLeft).toBe(0)
  })
})

describe('computeClientPacing bands', () => {
  // Fixed frame: reset day 1, now = July 10 → dayOfCycle 10, daysInCycle 31.
  // Budget $310 → ideal at day 10 = 100_000_000 micros.
  const now = at('2026-07-10T12:00:00Z')
  const client = { monthly_budget_micros: 310_000_000, budget_reset_day: 1 }
  const pace = (spendMicros: number) =>
    computeClientPacing([entry('2026-07-05', spendMicros)], client, [], now)

  it('exactly ideal is green with zero deviation', () => {
    const p = pace(100_000_000)
    expect(p.idealMicros).toBe(100_000_000)
    expect(p.deviation).toBe(0)
    expect(p.status).toBe('green')
  })

  it('within ±10% of ideal is green', () => {
    expect(pace(109_900_000).status).toBe('green')
    expect(pace(90_100_000).status).toBe('green')
  })

  it('between 10% and 25% off ideal is yellow', () => {
    expect(pace(110_200_000).status).toBe('yellow')
    expect(pace(124_000_000).status).toBe('yellow')
    expect(pace(89_000_000).status).toBe('yellow')
    expect(pace(75_100_000).status).toBe('yellow')
  })

  it('beyond 25% off ideal is red', () => {
    expect(pace(126_000_000).status).toBe('red')
    expect(pace(74_000_000).status).toBe('red')
  })

  it('exhausted budget is red regardless of deviation math', () => {
    expect(pace(310_000_000).status).toBe('red')
  })

  it('no budget (null or zero) is none', () => {
    const noBudget = computeClientPacing(
      [entry('2026-07-05', 50_000_000)],
      { monthly_budget_micros: null, budget_reset_day: 1 },
      [],
      now
    )
    expect(noBudget.status).toBe('none')
    expect(noBudget.deviation).toBeNull()
    expect(noBudget.pctUsed).toBeNull()

    const zeroBudget = computeClientPacing(
      [entry('2026-07-05', 50_000_000)],
      { monthly_budget_micros: 0, budget_reset_day: 1 },
      [],
      now
    )
    expect(zeroBudget.status).toBe('none')
  })

  it('projects linearly to cycle end', () => {
    expect(pace(100_000_000).projectedMicros).toBe(310_000_000)
  })

  it('includes entries on the window boundaries and excludes outside days', () => {
    const p = computeClientPacing(
      [
        entry('2026-06-30', 999_000_000),
        entry('2026-07-01', 40_000_000),
        entry('2026-07-10', 60_000_000),
      ],
      client,
      [],
      now
    )
    expect(p.spendMicros).toBe(100_000_000)
  })
})

describe('per-platform overrides', () => {
  const now = at('2026-07-10T12:00:00Z')
  const client = { monthly_budget_micros: 620_000_000, budget_reset_day: 1 }

  it('paces platforms with an override and leaves others spend-only', () => {
    const p = computeClientPacing(
      [entry('2026-07-05', 100_000_000, 'meta'), entry('2026-07-05', 55_000_000, 'google_ads')],
      client,
      [{ platform: 'meta', monthly_budget_override_micros: 310_000_000 }],
      now
    )
    const meta = p.perPlatform.find((x) => x.platform === 'meta')
    const google = p.perPlatform.find((x) => x.platform === 'google_ads')
    expect(meta?.status).toBe('green')
    expect(meta?.budgetMicros).toBe(310_000_000)
    expect(google?.status).toBe('none')
    expect(google?.budgetMicros).toBeNull()
    expect(google?.spendMicros).toBe(55_000_000)
  })

  it('lists an overridden platform even with zero spend', () => {
    const p = computeClientPacing(
      [],
      client,
      [{ platform: 'tiktok', monthly_budget_override_micros: 100_000_000 }],
      now
    )
    const tiktok = p.perPlatform.find((x) => x.platform === 'tiktok')
    expect(tiktok?.spendMicros).toBe(0)
    expect(tiktok?.status).toBe('red')
  })
})

describe('entriesForClient', () => {
  const connections = [
    { platform: 'meta', external_account_id: 'acc1', client_id: 'client-a' },
    { platform: 'meta', external_account_id: 'acc2', client_id: 'client-b' },
    { platform: 'google_ads', external_account_id: 'acc1', client_id: null },
  ]
  const entries = [
    { ...entry('2026-07-01', 10, 'meta'), external_account_id: 'acc1' },
    { ...entry('2026-07-01', 20, 'meta'), external_account_id: 'acc2' },
    { ...entry('2026-07-01', 40, 'google_ads'), external_account_id: 'acc1' },
  ]

  it('keeps only entries from accounts assigned to the client', () => {
    const mine = entriesForClient(entries, connections, 'client-a')
    expect(mine.map((e) => e.spend_micros)).toEqual([10])
  })

  it('disambiguates the same account id on two platforms', () => {
    // google_ads acc1 is unassigned; meta acc1 belongs to client-a — only meta counted.
    const mine = entriesForClient(entries, connections, 'client-a')
    expect(mine.every((e) => e.platform === 'meta')).toBe(true)
  })

  it('returns nothing for a client with no assigned accounts', () => {
    expect(entriesForClient(entries, connections, 'client-zzz')).toEqual([])
  })
})

describe('weeklyTrend', () => {
  const now = at('2026-07-21T12:00:00Z') // last: Jul 15–21, prior: Jul 8–14

  it('reports an upward trend', () => {
    const t = weeklyTrend([entry('2026-07-20', 200), entry('2026-07-10', 100)], now)
    expect(t).toEqual({ pct: 1, up: true })
  })

  it('reports a downward trend', () => {
    const t = weeklyTrend([entry('2026-07-18', 50), entry('2026-07-08', 100)], now)
    expect(t).toEqual({ pct: -0.5, up: false })
  })

  it('returns null when the prior window has no spend', () => {
    expect(weeklyTrend([entry('2026-07-20', 200)], now)).toBeNull()
  })

  it('respects the window boundaries', () => {
    // Jul 14 is prior-window's last day; Jul 15 is last-window's first day.
    const t = weeklyTrend([entry('2026-07-15', 300), entry('2026-07-14', 100)], now)
    expect(t).toEqual({ pct: 2, up: true })
  })
})
