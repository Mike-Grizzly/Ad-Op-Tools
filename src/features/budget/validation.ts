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

export const syncBudgetSchema = z.object({
  platform: adPlatformSchema,
  accountId: z.string().min(1).max(100).optional(),
  range: dateRangeSchema.optional(),
})

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

export type DateRangeInput = z.infer<typeof dateRangeSchema>
export type SyncBudgetInput = z.infer<typeof syncBudgetSchema>
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>
