import { z } from 'zod'

export const UtmParamsSchema = z.object({
  base_url:  z.string().url('Must be a valid URL'),
  source:    z.string().min(1, 'Source is required'),
  medium:    z.string().min(1, 'Medium is required'),
  campaign:  z.string().min(1, 'Campaign is required'),
  content:   z.string().optional(),
  term:      z.string().optional(),
  template_id: z.string().uuid().optional(),
})

export const UtmTemplateSchema = z.object({
  name:     z.string().min(1, 'Template name is required').max(100),
  source:   z.string().optional(),
  medium:   z.string().optional(),
  campaign: z.string().optional(),
  content:  z.string().optional(),
  term:     z.string().optional(),
})

export type UtmParams = z.infer<typeof UtmParamsSchema>
export type UtmTemplate = z.infer<typeof UtmTemplateSchema>
