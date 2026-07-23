import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncConnections, SyncPreconditionError, type SyncDeps, type SyncParams } from './sync-core'
import { PlatformApiError, UnsupportedPlatformError } from '@/lib/integrations/errors'
import type { ConnectionWithTokens } from '@/lib/integrations/connections'
import type { AdPlatformClient, CanonicalSpendRow } from '@/types/integrations'

// ── Minimal fake supabase: records calls, replays queued results ──────────────

type Call = { table: string; method: string; args: unknown[] }

function fakeSupabase(results: {
  select?: { data: unknown; error: unknown }
  upsert?: { error: unknown }[]
  update?: { error: unknown }[]
}) {
  const calls: Call[] = []
  const upserts = [...(results.upsert ?? [])]
  const updates = [...(results.update ?? [])]

  function chain(table: string) {
    const state: { method: string; args: unknown[] }[] = []
    const self: Record<string, unknown> = {}
    const record = (method: string) =>
      (...args: unknown[]) => {
        state.push({ method, args })
        calls.push({ table, method, args })
        return self
      }
    for (const m of ['select', 'eq', 'update']) self[m] = record(m)
    self.upsert = (...args: unknown[]) => {
      calls.push({ table, method: 'upsert', args })
      return Promise.resolve(upserts.shift() ?? { error: null })
    }
    // Awaiting the chain resolves the pending select or update.
    self.then = (resolve: (v: unknown) => void) => {
      const isUpdate = state.some((s) => s.method === 'update')
      resolve(isUpdate ? (updates.shift() ?? { error: null }) : (results.select ?? { data: [], error: null }))
    }
    return self
  }

  return {
    // `as never`: only `.from()` is faked — structurally typing a full SupabaseClient
    // for a test double isn't practical. The queued upsert/update results are
    // single-consumption; never await the same chain twice.
    client: { from: (table: string) => chain(table) } as never,
    calls,
  }
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class FakeApiError extends PlatformApiError {
  constructor(private readonly auth: boolean) {
    super('fake api error')
  }
  get isAuthError(): boolean {
    return this.auth
  }
  get isRateLimited(): boolean {
    return false
  }
  get isTransient(): boolean {
    return false
  }
}

function conn(externalAccountId: string): ConnectionWithTokens {
  return {
    id: `conn-${externalAccountId}`,
    platform: 'meta',
    externalAccountId,
    accountName: null,
    scopes: [],
    accessToken: 'token',
    refreshToken: null,
    tokenExpiresAt: null,
    status: 'connected',
  }
}

function spendRow(accountId: string, date: string): CanonicalSpendRow {
  return {
    platform: 'meta',
    external_account_id: accountId,
    campaign_external_id: 'camp-1',
    campaign_name: 'Campaign',
    entry_date: date,
    spend_micros: 1_000_000,
    currency: 'USD',
    impressions: 10,
    clicks: 1,
  }
}

function fakeClient(spend: CanonicalSpendRow[] | Error): AdPlatformClient {
  return {
    platform: 'meta',
    listCampaigns: async () => [],
    getDailySpend: async () => {
      if (spend instanceof Error) throw spend
      return spend
    },
  }
}

const params: SyncParams = {
  orgId: 'org-1',
  userId: 'user-1',
  platform: 'meta',
  range: { from: '2026-07-01', to: '2026-07-22' },
}

function deps(overrides: Partial<SyncDeps> = {}): SyncDeps & { marked: [string, string][] } {
  const marked: [string, string][] = []
  return {
    getConnection: async (_p, accountId) => conn(accountId),
    clientFor: () => fakeClient([spendRow('acct-1', '2026-07-20')]),
    markStatus: async (id, status) => {
      marked.push([id, status])
    },
    marked,
    ...overrides,
  }
}

vi.stubEnv('META_APP_SECRET', 'secret')
afterEach(() => vi.stubEnv('META_APP_SECRET', 'secret'))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('syncConnections', () => {
  it('upserts canonical rows with org attribution and updates last_synced_at', async () => {
    const db = fakeSupabase({
      select: { data: [{ external_account_id: 'acct-1' }, { external_account_id: 'acct-2' }], error: null },
    })
    const d = deps()
    const result = await syncConnections(db.client, params, d)

    expect(result).toEqual({ rowsSynced: 2, failures: 0 })
    const upserts = db.calls.filter((c) => c.method === 'upsert')
    expect(upserts).toHaveLength(2)
    const [rows, opts] = upserts[0].args as [Record<string, unknown>[], { onConflict: string }]
    expect(rows[0].user_id).toBe('user-1')
    expect(rows[0].org_id).toBe('org-1')
    expect(rows[0].synced_at).toEqual(expect.any(String))
    expect(opts.onConflict).toBe('org_id,platform,external_account_id,campaign_external_id,entry_date')

    const updates = db.calls.filter((c) => c.method === 'update')
    expect(updates).toHaveLength(2)
    const eqArgs = db.calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toContainEqual(['id', 'conn-acct-1'])
    expect(eqArgs).toContainEqual(['org_id', 'org-1'])
  })

  it('filters the connection lookup by accountId when given', async () => {
    const db = fakeSupabase({ select: { data: [{ external_account_id: 'acct-2' }], error: null } })
    await syncConnections(db.client, { ...params, accountId: 'acct-2' }, deps())
    const eqArgs = db.calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toContainEqual(['external_account_id', 'acct-2'])
  })

  it('still updates last_synced_at when a connection has no spend rows', async () => {
    const db = fakeSupabase({ select: { data: [{ external_account_id: 'acct-1' }], error: null } })
    const d = deps({ clientFor: () => fakeClient([]) })
    const result = await syncConnections(db.client, params, d)

    expect(result).toEqual({ rowsSynced: 0, failures: 0 })
    expect(db.calls.filter((c) => c.method === 'upsert')).toHaveLength(0)
    expect(db.calls.filter((c) => c.method === 'update')).toHaveLength(1)
  })

  it('counts a throwing getConnection as a failure and continues the loop', async () => {
    const db = fakeSupabase({
      select: { data: [{ external_account_id: 'bad' }, { external_account_id: 'acct-2' }], error: null },
    })
    const d = deps({
      getConnection: async (_p, accountId) => {
        if (accountId === 'bad') throw new Error('decrypt failed')
        return conn(accountId)
      },
    })
    const result = await syncConnections(db.client, params, d)
    expect(result).toEqual({ rowsSynced: 1, failures: 1 })
  })

  it('counts a null connection as a failure', async () => {
    const db = fakeSupabase({ select: { data: [{ external_account_id: 'acct-1' }], error: null } })
    const d = deps({ getConnection: async () => null })
    const result = await syncConnections(db.client, params, d)
    expect(result).toEqual({ rowsSynced: 0, failures: 1 })
  })

  it('marks the connection expired on a platform auth error', async () => {
    const db = fakeSupabase({ select: { data: [{ external_account_id: 'acct-1' }], error: null } })
    const d = deps({ clientFor: () => fakeClient(new FakeApiError(true)) })
    const result = await syncConnections(db.client, params, d)
    expect(result).toEqual({ rowsSynced: 0, failures: 1 })
    expect(d.marked).toEqual([['conn-acct-1', 'expired']])
  })

  it('marks the connection errored on a non-auth failure', async () => {
    const db = fakeSupabase({ select: { data: [{ external_account_id: 'acct-1' }], error: null } })
    const d = deps({ clientFor: () => fakeClient(new Error('boom')) })
    const result = await syncConnections(db.client, params, d)
    expect(result).toEqual({ rowsSynced: 0, failures: 1 })
    expect(d.marked).toEqual([['conn-acct-1', 'error']])
  })

  it('counts an upsert error as a failure and skips last_synced_at for that connection', async () => {
    const db = fakeSupabase({
      select: { data: [{ external_account_id: 'acct-1' }, { external_account_id: 'acct-2' }], error: null },
      upsert: [{ error: { message: 'db down' } }, { error: null }],
    })
    const result = await syncConnections(db.client, params, deps())
    expect(result).toEqual({ rowsSynced: 1, failures: 1 })
    expect(db.calls.filter((c) => c.method === 'update')).toHaveLength(1)
  })

  it('throws query-failed when the connections select errors', async () => {
    const db = fakeSupabase({ select: { data: null, error: { message: 'nope' } } })
    await expect(syncConnections(db.client, params, deps())).rejects.toMatchObject({
      name: 'SyncPreconditionError',
      code: 'query-failed',
    })
  })

  it('throws no-connections when nothing matches', async () => {
    const db = fakeSupabase({ select: { data: [], error: null } })
    await expect(syncConnections(db.client, params, deps())).rejects.toBeInstanceOf(SyncPreconditionError)
  })

  it('rejects unsupported platforms before touching the database', async () => {
    const db = fakeSupabase({ select: { data: [], error: null } })
    await expect(
      syncConnections(db.client, { ...params, platform: 'google_ads' }, deps())
    ).rejects.toBeInstanceOf(UnsupportedPlatformError)
    expect(db.calls).toHaveLength(0)
  })
})
