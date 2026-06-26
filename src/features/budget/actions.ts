'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getConnectionWithTokens, markConnectionStatus } from '@/lib/integrations/connections'
import { createMetaClient, MetaApiError } from '@/lib/integrations/meta/client'
import { syncBudgetSchema, connectionIdSchema } from './validation'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

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
    .eq('user_id', user.id)
    .eq('platform', platform)
  if (accountId) query = query.eq('external_account_id', accountId)

  const { data: conns, error: connErr } = await query
  if (connErr) return { error: 'Failed to load connections' }
  if (!conns || conns.length === 0) return { error: 'No connection found for this platform' }

  let rowsSynced = 0
  let failures = 0

  for (const { external_account_id } of conns) {
    const conn = await getConnectionWithTokens(platform, external_account_id)
    if (!conn) {
      failures += 1
      continue
    }
    try {
      const client = createMetaClient(conn.accessToken, appSecret)
      const spend = await client.getDailySpend(external_account_id, range)

      if (spend.length > 0) {
        const rows = spend.map((r) => ({
          user_id: user.id,
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
          onConflict: 'user_id,platform,external_account_id,campaign_external_id,entry_date',
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
        .eq('user_id', user.id)
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = connectionIdSchema.safeParse(id)
  if (!parsed.success) return { error: 'Invalid id' }

  const { error } = await supabase
    .from('platform_connections')
    .delete()
    .eq('id', parsed.data)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to disconnect' }

  revalidatePath('/budget')
  return { data: { id: parsed.data } }
}
