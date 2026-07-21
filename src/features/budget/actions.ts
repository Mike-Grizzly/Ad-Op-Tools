'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/features/org/queries'
import { getConnectionWithTokens, markConnectionStatus } from '@/lib/integrations/connections'
import { createMetaClient, MetaApiError } from '@/lib/integrations/meta/client'
import { syncBudgetSchema, connectionIdSchema, setCapsSchema } from './validation'
import { DEFAULT_SYNC_DAYS } from './constants'
import type { DateRange } from '@/types/integrations'

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string }

function defaultRange(days: number): DateRange {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - days)
  return { from: from.toISOString().slice(0, 10), to }
}

export async function syncBudget(
  input: unknown
): Promise<ActionResult<{ rowsSynced: number; failures: number }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, userId, orgId } = ctx

  const parsed = syncBudgetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { platform, accountId, range: inputRange } = parsed.data
  // Phase 1 supports Meta only. Before enabling another platform, add a client-factory
  // branch below — do NOT just drop this guard (the code path builds a Meta client).
  if (platform !== 'meta') return { error: 'Only Meta is supported right now' }

  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return { error: 'Meta is not configured' }

  const range = inputRange ?? defaultRange(DEFAULT_SYNC_DAYS)

  // One connection if accountId is given, else every connection for this platform.
  let query = supabase
    .from('platform_connections')
    .select('external_account_id')
    .eq('org_id', orgId)
    .eq('platform', platform)
  if (accountId) query = query.eq('external_account_id', accountId)

  const { data: conns, error: connErr } = await query
  if (connErr) return { error: 'Failed to load connections' }
  if (!conns || conns.length === 0) return { error: 'No connection found for this platform' }

  let rowsSynced = 0
  let failures = 0

  for (const { external_account_id } of conns) {
    // Inside the loop's failure accounting: one undecryptable/corrupt connection row
    // must not abort the sync for every other account.
    let conn: Awaited<ReturnType<typeof getConnectionWithTokens>>
    try {
      conn = await getConnectionWithTokens(platform, external_account_id)
    } catch {
      failures += 1
      continue
    }
    if (!conn) {
      failures += 1
      continue
    }
    try {
      const client = createMetaClient(conn.accessToken, appSecret)
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
      await markConnectionStatus(
        conn.id,
        err instanceof MetaApiError && err.isAuthError ? 'expired' : 'error'
      )
    }
  }

  revalidatePath('/budget')
  return { data: { rowsSynced, failures } }
}

export async function disconnectPlatform(id: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, orgId } = ctx

  const parsed = connectionIdSchema.safeParse(id)
  if (!parsed.success) return { error: 'Invalid id' }

  const { error } = await supabase
    .from('platform_connections')
    .delete()
    .eq('id', parsed.data)
    .eq('org_id', orgId)

  if (error) return { error: 'Failed to disconnect' }

  revalidatePath('/budget')
  return { data: { id: parsed.data } }
}

export async function setCaps(input: unknown): Promise<ActionResult<{ count: number }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, userId, orgId } = ctx

  const parsed = setCapsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const rows = parsed.data.caps.map((c) => ({
    user_id: userId,
    org_id: orgId,
    scope: c.scope,
    amount_micros: Math.round(c.amount * 1_000_000),
  }))
  if (rows.length === 0) return { data: { count: 0 } }

  const { error } = await supabase
    .from('budget_caps')
    .upsert(rows, { onConflict: 'org_id,scope' })
  if (error) return { error: 'Failed to save caps' }

  revalidatePath('/budget')
  return { data: { count: rows.length } }
}
