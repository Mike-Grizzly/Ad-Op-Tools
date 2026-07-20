import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('platform_connections')
    .select(
      'id, platform, external_account_id, account_name, scopes, status, token_expires_at, last_synced_at, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch connections: ${error.message}`)
  return data
}

export async function getBudgetEntries(range: DateRange): Promise<BudgetEntry[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('budget_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('entry_date', range.from)
    .lte('entry_date', range.to)
    .order('entry_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch budget entries: ${error.message}`)
  return data
}

export async function getCaps(): Promise<BudgetCap[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('budget_caps')
    .select('*')
    .eq('user_id', user.id)
  if (error) throw new Error(`Failed to fetch caps: ${error.message}`)
  return data
}
