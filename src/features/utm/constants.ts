export const UTM_SOURCES = [
  'google',
  'meta',
  'linkedin',
  'tiktok',
  'email',
  'newsletter',
  'direct',
  'organic',
] as const

export const UTM_MEDIUMS = [
  'cpc',
  'paid_social',
  'email',
  'organic',
  'social',
  'referral',
  'display',
  'video',
] as const

export type UtmSource = typeof UTM_SOURCES[number]
export type UtmMedium = typeof UTM_MEDIUMS[number]

export const UTM_HISTORY_LIMIT = 50
