// Client-side preview builder for tagged URLs. Shared by the form's live preview
// and the detail drawer's edit preview. The authoritative persisted URL is rebuilt
// server-side in actions.ts (buildUTMUrl) on save — this is only for instant preview.

export function buildPreviewUrl(
  base: string, source: string, medium: string, campaign: string,
  content: string, term: string, adSet: string, creative: string
): string {
  const trimmed = base.trim()
  if (!trimmed) return ''
  const clean = (v: string) => v.trim().replace(/\s+/g, '_')
  const parts: string[] = []
  if (source) parts.push('utm_source=' + encodeURIComponent(clean(source)))
  if (medium) parts.push('utm_medium=' + encodeURIComponent(clean(medium)))
  if (campaign) parts.push('utm_campaign=' + encodeURIComponent(clean(campaign)))
  if (content) parts.push('utm_content=' + encodeURIComponent(clean(content)))
  if (term) parts.push('utm_term=' + encodeURIComponent(clean(term)))
  if (adSet) parts.push('utm_adset=' + encodeURIComponent(clean(adSet)))
  if (creative) parts.push('utm_creative=' + encodeURIComponent(clean(creative)))
  if (!parts.length) return trimmed
  return trimmed + (trimmed.includes('?') ? '&' : '?') + parts.join('&')
}
