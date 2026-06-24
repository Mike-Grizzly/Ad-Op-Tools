"use server"

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { UtmParamsSchema, UtmTemplateSchema } from './validation'

type ActionResult<T = void> = { data: T; error?: undefined } | { data?: undefined; error: string }

export async function generateUtm(
  input: unknown
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = UtmParamsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { base_url, source, medium, campaign, content, term, template_id } = parsed.data

  const url = new URL(base_url)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)
  if (content) url.searchParams.set('utm_content', content)
  if (term) url.searchParams.set('utm_term', term)

  const generated_url = url.toString()

  const { error: insertError } = await supabase.from('utm_history').insert({
    user_id: user.id,
    base_url,
    source,
    medium,
    campaign,
    content: content ?? null,
    term: term ?? null,
    template_id: template_id ?? null,
    generated_url,
  })

  if (insertError) return { error: insertError.message }

  revalidatePath('/utm')
  return { data: { url: generated_url } }
}

export async function saveTemplate(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = UtmTemplateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { data, error } = await supabase
    .from('utm_templates')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/utm')
  return { data: { id: data.id } }
}

export async function deleteTemplate(
  templateId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('utm_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/utm')
  return { data: undefined }
}
