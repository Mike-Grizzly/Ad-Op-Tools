'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/features/org/queries'
import { getConnectionWithTokens, markConnectionStatus } from '@/lib/integrations/connections'
import { getClientForConnection } from '@/lib/integrations/factory'
import { PlatformNotConfiguredError, UnsupportedPlatformError } from '@/lib/integrations/errors'
import { syncConnections, SyncPreconditionError } from './sync-core'
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
  const range = inputRange ?? defaultRange(DEFAULT_SYNC_DAYS)

  // The loop lives in sync-core (transport-agnostic; the future cron calls it with a
  // service-role client). This action stays the session shim: auth, parsing, and the
  // user-facing wording for the typed errors the core throws.
  try {
    const result = await syncConnections(
      supabase,
      { orgId, userId, platform, accountId, range },
      {
        getConnection: getConnectionWithTokens,
        clientFor: getClientForConnection,
        markStatus: markConnectionStatus,
      }
    )
    revalidatePath('/budget')
    return { data: result }
  } catch (err) {
    if (err instanceof UnsupportedPlatformError) return { error: 'Only Meta is supported right now' }
    if (err instanceof PlatformNotConfiguredError) return { error: 'Meta is not configured' }
    if (err instanceof SyncPreconditionError) {
      return {
        error:
          err.code === 'no-connections'
            ? 'No connection found for this platform'
            : 'Failed to load connections',
      }
    }
    throw err
  }
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
