'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/features/org/queries'
import {
  createClientSchema,
  updateClientSchema,
  assignConnectionSchema,
  clientIdSchema,
} from './validation'
import type { Database } from '@/types/database'

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string }

function toMicros(units: number): number {
  return Math.round(units * 1_000_000)
}

export async function createClient(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, userId, orgId } = ctx

  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const c = parsed.data
  const { data, error } = await supabase
    .from('clients')
    .insert({
      org_id: orgId,
      user_id: userId,
      name: c.name,
      monthly_budget_micros: c.monthlyBudget == null ? null : toMicros(c.monthlyBudget),
      budget_reset_day: c.budgetResetDay,
      currency: c.currency,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to create client' }

  revalidatePath('/clients')
  return { data: { id: data.id } }
}

export async function updateClient(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, orgId } = ctx

  const parsed = updateClientSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { id, overrides, ...fields } = parsed.data

  const patch: Database['public']['Tables']['clients']['Update'] = {}
  if (fields.name !== undefined) patch.name = fields.name
  if (fields.monthlyBudget !== undefined)
    patch.monthly_budget_micros = fields.monthlyBudget == null ? null : toMicros(fields.monthlyBudget)
  if (fields.budgetResetDay !== undefined) patch.budget_reset_day = fields.budgetResetDay
  if (fields.currency !== undefined) patch.currency = fields.currency

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('clients')
      .update(patch)
      .eq('id', id)
      .eq('org_id', orgId)
    if (error) return { error: 'Failed to update client' }
  }

  if (overrides !== undefined) {
    // Replace-all semantics: the given rows become the full override set.
    const { error: delErr } = await supabase
      .from('client_platforms')
      .delete()
      .eq('client_id', id)
      .eq('org_id', orgId)
    if (delErr) return { error: 'Failed to update overrides' }

    if (overrides.length > 0) {
      const rows = overrides.map((o) => ({
        org_id: orgId,
        client_id: id,
        platform: o.platform,
        monthly_budget_override_micros: toMicros(o.amount),
      }))
      const { error: insErr } = await supabase.from('client_platforms').insert(rows)
      if (insErr) return { error: 'Failed to update overrides' }
    }
  }

  revalidatePath('/clients')
  return { data: { id } }
}

export async function deleteClient(id: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, orgId } = ctx

  const parsed = clientIdSchema.safeParse(id)
  if (!parsed.success) return { error: 'Invalid id' }

  // Overrides cascade; assigned connections detach (client_id → null); spend untouched.
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', parsed.data)
    .eq('org_id', orgId)

  if (error) return { error: 'Failed to delete client' }

  revalidatePath('/clients')
  return { data: { id: parsed.data } }
}

export async function assignConnection(
  input: unknown
): Promise<ActionResult<{ connectionId: string }>> {
  const ctx = await getOrgContext()
  if (!ctx) return { error: 'Unauthorized' }
  const { supabase, orgId } = ctx

  const parsed = assignConnectionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { error } = await supabase
    .from('platform_connections')
    .update({ client_id: parsed.data.clientId })
    .eq('id', parsed.data.connectionId)
    .eq('org_id', orgId)

  // A cross-org client id is impossible via the composite FK; surface it plainly.
  if (error) return { error: 'Failed to assign connection' }

  revalidatePath('/clients')
  revalidatePath('/budget')
  return { data: { connectionId: parsed.data.connectionId } }
}
