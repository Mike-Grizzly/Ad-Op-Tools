import { z } from 'zod'
import { AD_PLATFORMS } from '@/types/integrations'

export const adPlatformSchema = z.enum(AD_PLATFORMS)

// YYYY-MM-DD; lexicographic compare is chronological for this format.
export const dateRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  })
  .refine((r) => r.from <= r.to, { message: 'from must be on or before to' })
  // Cap the window so a huge range can't fan out into platform rate-limit territory.
  .refine((r) => (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000 <= 365, {
    message: 'Date range must be 365 days or less',
  })

export const syncBudgetSchema = z.object({
  platform: adPlatformSchema,
  accountId: z.string().min(1).max(100).optional(),
  range: dateRangeSchema.optional(),
})

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

export const connectionIdSchema = z.string().uuid()

// Cap scopes: 'overall' (total) or a specific platform. Amounts are entered in whole
// currency units (dollars); the action converts to integer micros for storage.
const CAP_SCOPES = ['overall', ...AD_PLATFORMS] as const

export const setCapsSchema = z.object({
  caps: z
    .array(
      z.object({
        scope: z.enum(CAP_SCOPES),
        amount: z.number().nonnegative().max(1_000_000_000),
      })
    )
    .max(8),
})

export type SetCapsInput = z.infer<typeof setCapsSchema>

export type DateRangeInput = z.infer<typeof dateRangeSchema>
export type SyncBudgetInput = z.infer<typeof syncBudgetSchema>
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>
