import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AdPlatform, DateRange, PlatformConnectionStatus } from '@/types/integrations'
import type { AdPlatformClient } from '@/types/integrations'
import type { ConnectionWithTokens } from '@/lib/integrations/connections'
import { assertPlatformReady } from '@/lib/integrations/factory'
import { PlatformApiError } from '@/lib/integrations/errors'

// Transport-agnostic sync loop (blueprint §3.3 step 1). The server action calls this
// with the session client today; the future cron route calls it with a service-role
// client and explicit org scope. All platform knowledge stays behind the injected
// factory; all user-facing message wording stays in the caller.

type DbClient = SupabaseClient<Database>

export type SyncParams = {
  orgId: string
  userId: string
  platform: AdPlatform
  accountId?: string
  range: DateRange
}

// Required (never defaulted): getConnection and markStatus currently resolve their org
// via getOrgContext() internally, so the default wiring only works from a user session.
// The cron slice must add (supabase, orgId)-parameterized variants in connections.ts
// and inject those — a defaulted session-bound dep would let that route compile and
// silently count every connection as a failure.
export type SyncDeps = {
  getConnection: (
    platform: AdPlatform,
    externalAccountId: string
  ) => Promise<ConnectionWithTokens | null>
  clientFor: (conn: ConnectionWithTokens) => AdPlatformClient
  markStatus: (connectionId: string, status: PlatformConnectionStatus) => Promise<void>
}

// Precondition failures before the loop starts; callers map codes to their own
// user-facing wording.
export class SyncPreconditionError extends Error {
  readonly code: 'query-failed' | 'no-connections'

  constructor(code: 'query-failed' | 'no-connections') {
    super(code)
    this.name = 'SyncPreconditionError'
    this.code = code
  }
}

export async function syncConnections(
  supabase: DbClient,
  params: SyncParams,
  deps: SyncDeps
): Promise<{ rowsSynced: number; failures: number }> {
  const { orgId, userId, platform, accountId, range } = params

  // Must run before the connection lookup: "unsupported platform" and "not
  // configured" outrank "no connection found" (see factory.assertPlatformReady).
  assertPlatformReady(platform)

  // One connection if accountId is given, else every connection for this platform.
  let query = supabase
    .from('platform_connections')
    .select('external_account_id')
    .eq('org_id', orgId)
    .eq('platform', platform)
  if (accountId) query = query.eq('external_account_id', accountId)

  const { data: conns, error: connErr } = await query
  if (connErr) throw new SyncPreconditionError('query-failed')
  if (!conns || conns.length === 0) throw new SyncPreconditionError('no-connections')

  let rowsSynced = 0
  let failures = 0

  for (const { external_account_id } of conns) {
    // Inside the loop's failure accounting: one undecryptable/corrupt connection row
    // must not abort the sync for every other account.
    let conn: ConnectionWithTokens | null
    try {
      conn = await deps.getConnection(platform, external_account_id)
    } catch {
      failures += 1
      continue
    }
    if (!conn) {
      failures += 1
      continue
    }
    try {
      const client = deps.clientFor(conn)
      const spend = await client.getDailySpend(external_account_id, range)

      if (spend.length > 0) {
        const rows = spend.map((r) => ({
          user_id: userId,
          org_id: orgId,
          platform: r.platform,
          external_account_id: r.external_account_id,
          campaign_external_id: r.campaign_external_id,
          campaign_name: r.campaign_name,
          entry_date: r.entry_date,
          spend_micros: r.spend_micros,
          currency: r.currency,
          impressions: r.impressions,
          clicks: r.clicks,
          synced_at: new Date().toISOString(),
        }))
        const { error: upsertErr } = await supabase.from('budget_entries').upsert(rows, {
          onConflict: 'org_id,platform,external_account_id,campaign_external_id,entry_date',
        })
        if (upsertErr) {
          failures += 1
          continue
        }
        rowsSynced += rows.length
      }

      await supabase
        .from('platform_connections')
        .update({ last_synced_at: new Date().toISOString(), status: 'connected' })
        .eq('id', conn.id)
        .eq('org_id', orgId)
    } catch (err) {
      failures += 1
      await deps.markStatus(
        conn.id,
        err instanceof PlatformApiError && err.isAuthError ? 'expired' : 'error'
      )
    }
  }

  return { rowsSynced, failures }
}
