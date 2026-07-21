import { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type OrgContext = {
  supabase: ServerClient
  userId: string
  orgId: string
}

// Single resolution point for "who is calling and which org are they in".
// Returns null iff there is no authenticated user (callers map that to their own
// contract: actions return { error: 'Unauthorized' }, queries throw).
// An authenticated user with zero memberships is an invariant violation — the
// signup trigger + backfill migration guarantee at least one — so that fails loud.
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Oldest membership = the personal org. When the org switcher ships, an
  // active-org cookie replaces this ordering heuristic.
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to resolve organization: ${error.message}`)
  if (!data) throw new Error('No organization membership')

  return { supabase, userId: user.id, orgId: data.org_id }
}
