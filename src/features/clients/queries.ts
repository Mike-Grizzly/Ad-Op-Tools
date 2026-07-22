import { getOrgContext } from '@/features/org/queries'
import type { Database } from '@/types/database'

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientPlatform = Database['public']['Tables']['client_platforms']['Row']

export async function getClients(): Promise<Client[]> {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error('Unauthorized')
  const { supabase, orgId } = ctx

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`)
  return data
}

export async function getClientPlatforms(): Promise<ClientPlatform[]> {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error('Unauthorized')
  const { supabase, orgId } = ctx

  const { data, error } = await supabase
    .from('client_platforms')
    .select('*')
    .eq('org_id', orgId)

  if (error) throw new Error(`Failed to fetch client overrides: ${error.message}`)
  return data
}
