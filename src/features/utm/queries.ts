import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { UTM_HISTORY_LIMIT } from './constants'

export type UtmTemplateRow = Tables<'utm_templates'>
export type UtmHistoryRow  = Tables<'utm_history'>

export async function getUtmTemplates(): Promise<UtmTemplateRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('utm_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getUtmHistory(): Promise<UtmHistoryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('utm_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(UTM_HISTORY_LIMIT)

  if (error) throw error
  return data
}
