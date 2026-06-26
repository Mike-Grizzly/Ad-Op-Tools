'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { utmParamsSchema, saveTemplateSchema, utmHistoryIdSchema } from './validation'
import type { UTMParamsInput, SaveTemplateInput } from './validation'
import type { Database } from '@/types/database'

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string }
type UTMHistoryEntry = Database['public']['Tables']['utm_history']['Row']

export async function generateAndSaveURL(
  input: unknown
): Promise<ActionResult<{ generated_url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = utmParamsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const params = parsed.data
  const generated_url = buildUTMUrl(params)

  const { error } = await supabase.from('utm_history').insert({
    user_id: user.id,
    base_url: params.base_url,
    source: params.source,
    medium: params.medium,
    campaign: params.campaign,
    content: params.content || null,
    term: params.term || null,
    ad_set: params.ad_set || null,
    creative: params.creative || null,
    generated_url,
  })

  if (error) return { error: 'Failed to save to history' }

  revalidatePath('/utm')
  return { data: { generated_url } }
}

export async function updateUTMHistory(
  id: unknown,
  input: unknown
): Promise<ActionResult<UTMHistoryEntry>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const idParsed = utmHistoryIdSchema.safeParse(id)
  if (!idParsed.success) return { error: 'Invalid id' }

  const parsed = utmParamsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const params = parsed.data
  const generated_url = buildUTMUrl(params)

  const { data, error } = await supabase
    .from('utm_history')
    .update({
      base_url: params.base_url,
      source: params.source,
      medium: params.medium,
      campaign: params.campaign,
      content: params.content || null,
      term: params.term || null,
      ad_set: params.ad_set || null,
      creative: params.creative || null,
      generated_url,
    })
    .eq('id', idParsed.data)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error || !data) return { error: 'Failed to update URL' }

  revalidatePath('/utm')
  return { data }
}

export async function deleteUTMHistory(
  id: unknown
): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const idParsed = utmHistoryIdSchema.safeParse(id)
  if (!idParsed.success) return { error: 'Invalid id' }

  const { error } = await supabase
    .from('utm_history')
    .delete()
    .eq('id', idParsed.data)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to delete URL' }

  revalidatePath('/utm')
  return { data: null }
}

export async function saveTemplate(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = saveTemplateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const params = parsed.data
  const { data, error } = await supabase
    .from('utm_templates')
    .insert({
      user_id: user.id,
      name: params.name,
      source: params.source || null,
      medium: params.medium || null,
      campaign: params.campaign || null,
      content: params.content || null,
      term: params.term || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'A template with that name already exists' }
    return { error: 'Failed to save template' }
  }

  revalidatePath('/utm')
  return { data: { id: data.id } }
}

export async function deleteTemplate(
  id: string
): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('utm_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to delete template' }

  revalidatePath('/utm')
  return { data: null }
}

const AUTOCOMPLETE_FIELDS = ['campaign', 'base_url'] as const
type AutocompleteField = typeof AUTOCOMPLETE_FIELDS[number]

export async function getAutocompleteSuggestions(
  field: unknown,
  prefix: unknown
): Promise<ActionResult<string[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!AUTOCOMPLETE_FIELDS.includes(field as AutocompleteField)) {
    return { error: 'Invalid field' }
  }

  const validField = field as AutocompleteField
  const trimmed = typeof prefix === 'string' ? prefix.trim().slice(0, 200) : ''
  if (trimmed.length < 2) return { data: [] }

  const { data, error } = await supabase
    .from('utm_history')
    .select('campaign, base_url')
    .eq('user_id', user.id)
    .ilike(validField, `${trimmed}%`)
    .order(validField)
    .limit(8)

  if (error) return { error: 'Failed to fetch suggestions' }

  const values = data.map(r => validField === 'campaign' ? r.campaign : r.base_url)
  const unique = [...new Set(values)].filter(Boolean) as string[]
  return { data: unique }
}

function buildUTMUrl(params: UTMParamsInput): string {
  const url = new URL(params.base_url)
  url.searchParams.set('utm_source', params.source)
  url.searchParams.set('utm_medium', params.medium)
  url.searchParams.set('utm_campaign', params.campaign)
  if (params.content) url.searchParams.set('utm_content', params.content)
  if (params.term) url.searchParams.set('utm_term', params.term)
  if (params.ad_set) url.searchParams.set('utm_adset', params.ad_set)
  if (params.creative) url.searchParams.set('utm_creative', params.creative)
  return url.toString()
}
