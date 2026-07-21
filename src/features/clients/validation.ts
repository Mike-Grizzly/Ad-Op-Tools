import { z } from 'zod'
import { AD_PLATFORMS } from '@/types/integrations'

export const clientIdSchema = z.string().uuid()

const adPlatformSchema = z.enum(AD_PLATFORMS)

// Budgets are entered in whole currency units; actions convert to micros.
const budgetAmountSchema = z.number().nonnegative().max(1_000_000_000)

export const createClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  monthlyBudget: budgetAmountSchema.nullable(),
  budgetResetDay: z.number().int().min(1).max(28),
  currency: z.string().regex(/^[A-Z]{3}$/),
})
export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientSchema = z.object({
  id: clientIdSchema,
  name: z.string().trim().min(1).max(120).optional(),
  monthlyBudget: budgetAmountSchema.nullable().optional(),
  budgetResetDay: z.number().int().min(1).max(28).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  // Replace-all semantics (like setCaps): the rows given become the full override set.
  overrides: z
    .array(z.object({ platform: adPlatformSchema, amount: budgetAmountSchema }))
    .max(8)
    .optional(),
})
export type UpdateClientInput = z.infer<typeof updateClientSchema>

export const assignConnectionSchema = z.object({
  connectionId: z.string().uuid(),
  clientId: clientIdSchema.nullable(),
})
export type AssignConnectionInput = z.infer<typeof assignConnectionSchema>
