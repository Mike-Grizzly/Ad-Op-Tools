import { getOrgContext } from '@/features/org/queries'
import type { Database } from '@/types/database'
import type { DateRange } from '@/types/integrations'

// The only connection shape the UI ever sees: token columns are deliberately excluded.
// Token values are read solely by the server-side decrypt helper in lib/integrations/connections.ts.
export type PlatformConnectionPublic = Pick<
  Database['public']['Tables']['platform_connections']['Row'],
  | 'id'
  | 'platform'
  | 'external_account_id'
  | 'account_name'
  | 'scopes'
  | 'status'
  | 'token_expires_at'
  | 'last_synced_at'
  | 'created_at'
  | 'updated_at'
>

export type BudgetEntry = Database['public']['Tables']['budget_entries']['Row']
export type BudgetCap = Database['public']['Tables']['budget_caps']['Row']

export async function getConnections(): Promise<PlatformConnectionPublic[]> {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error('Unauthorized')
  const { supabase, orgId } = ctx

  const { data, error } = await supabase
    .from('platform_connections')
    .select(
      'id, platform, external_account_id, account_name, scopes, status, token_expires_at, last_synced_at, created_at, updated_at'
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch connections: ${error.message}`)
  return data
}

export async function getBudgetEntries(range: DateRange): Promise<BudgetEntry[]> {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error('Unauthorized')
  const { supabase, orgId } = ctx

  const { data, error } = await supabase
    .from('budget_entries')
    .select('*')
    .eq('org_id', orgId)
    .gte('entry_date', range.from)
    .lte('entry_date', range.to)
    .order('entry_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch budget entries: ${error.message}`)
  return data
}

export async function getCaps(): Promise<BudgetCap[]> {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error('Unauthorized')
  const { supabase, orgId } = ctx

  const { data, error } = await supabase.from('budget_caps').select('*').eq('org_id', orgId)
  if (error) throw new Error(`Failed to fetch caps: ${error.message}`)
  return data
}
