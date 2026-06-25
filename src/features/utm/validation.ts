import { z } from 'zod'

export const utmParamsSchema = z.object({
  base_url: z
    .string()
    .url('Must be a valid URL')
    .max(2000, 'URL too long'),
  source: z
    .string()
    .min(1, 'Source is required')
    .max(100)
    .regex(/^[a-z0-9_.-]+$/i, 'Only letters, numbers, underscores, hyphens, and dots allowed'),
  medium: z
    .string()
    .min(1, 'Medium is required')
    .max(100)
    .regex(/^[a-z0-9_.-]+$/i, 'Only letters, numbers, underscores, hyphens, and dots allowed'),
  campaign: z
    .string()
    .min(1, 'Campaign is required')
    .max(200)
    .regex(/^[a-z0-9_. -]+$/i, 'Only letters, numbers, spaces, underscores, hyphens, and dots allowed'),
  content: z
    .string()
    .max(200)
    .regex(/^[a-z0-9_. -]*$/i, 'Only letters, numbers, spaces, underscores, hyphens, and dots allowed')
    .optional()
    .or(z.literal('')),
  term: z
    .string()
    .max(200)
    .regex(/^[a-z0-9_. -]*$/i, 'Only letters, numbers, spaces, underscores, hyphens, and dots allowed')
    .optional()
    .or(z.literal('')),
})

export type UTMParamsInput = z.infer<typeof utmParamsSchema>

export const saveTemplateSchema = utmParamsSchema.omit({ base_url: true }).extend({
  name: z.string().min(1, 'Template name is required').max(100),
  source: z.string().max(100).optional().or(z.literal('')),
  medium: z.string().max(100).optional().or(z.literal('')),
  campaign: z.string().max(200).optional().or(z.literal('')),
})

export type SaveTemplateInput = z.infer<typeof saveTemplateSchema>
