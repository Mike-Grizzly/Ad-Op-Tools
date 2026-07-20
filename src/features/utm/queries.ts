import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type UTMTemplate = Database['public']['Tables']['utm_templates']['Row']
type UTMHistoryEntry = Database['public']['Tables']['utm_history']['Row']

export async function getUTMTemplates(): Promise<UTMTemplate[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('utm_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch UTM templates: ${error.message}`)
  return data
}

export async function getUTMHistory(limit = 500): Promise<UTMHistoryEntry[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('utm_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch UTM history: ${error.message}`)
  return data
}
