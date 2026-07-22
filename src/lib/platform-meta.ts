// Shared ad-platform display identity (name, brand color, glyph chip). Lifted from
// budget-helpers.ts when the clients feature became the second consumer; budget-helpers
// re-exports these, so budget components keep their existing imports.

const PLATFORM_META: Record<string, { name: string; color: string; glyph: string }> = {
  meta: { name: 'Meta', color: '#0866FF', glyph: 'M' },
  google_ads: { name: 'Google Ads', color: '#EA4335', glyph: 'G' },
  linkedin: { name: 'LinkedIn', color: '#0A66C2', glyph: 'in' },
  tiktok: { name: 'TikTok', color: '#010101', glyph: 'TT' },
}

export function platformLabel(platform: string): string {
  return PLATFORM_META[platform]?.name ?? platform
}

export function platformColor(platform: string): string {
  return PLATFORM_META[platform]?.color ?? '#6b727f'
}

export function platformGlyph(platform: string): string {
  return PLATFORM_META[platform]?.glyph ?? platform.slice(0, 1).toUpperCase()
}
