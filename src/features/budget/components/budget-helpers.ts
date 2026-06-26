import type { BudgetEntry, BudgetCap, PlatformConnectionPublic } from '../queries'

export type RangeKey = '7' | '30' | '90' | 'mtd'

export type RangeOption = { key: RangeKey; label: string; days: number }

export const RANGE_OPTIONS: RangeOption[] = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'mtd', label: 'This month', days: 0 },
]

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

export function microsToUnits(micros: number): number {
  return micros / 1_000_000
}

export function formatMoney(units: number, currency: string, opts?: { compact?: boolean }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts?.compact ? 1 : 2,
    minimumFractionDigits: opts?.compact ? 0 : 2,
  }).format(units)
}

export function formatMoneyMicros(micros: number, currency: string, opts?: { compact?: boolean }): string {
  return formatMoney(microsToUnits(micros), currency, opts)
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function formatCompactInt(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(fraction >= 0.1 ? 0 : 1)}%`
}

// Picks the currency that accounts for the most spend, so single-currency accounts (the
// common case) always render in their own currency; mixed currencies fall back to it.
export function dominantCurrency(entries: BudgetEntry[], fallback = 'USD'): string {
  if (entries.length === 0) return fallback
  const byCurrency = new Map<string, number>()
  for (const e of entries) {
    byCurrency.set(e.currency, (byCurrency.get(e.currency) ?? 0) + e.spend_micros)
  }
  let best = fallback
  let bestSpend = -1
  for (const [cur, spend] of byCurrency) {
    if (spend > bestSpend) {
      bestSpend = spend
      best = cur
    }
  }
  return best
}

export function distinctCurrencies(entries: BudgetEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.currency)))
}

export function sumMicros(entries: BudgetEntry[]): number {
  return entries.reduce((acc, e) => acc + e.spend_micros, 0)
}

export function sumImpressions(entries: BudgetEntry[]): number {
  return entries.reduce((acc, e) => acc + (e.impressions ?? 0), 0)
}

export function sumClicks(entries: BudgetEntry[]): number {
  return entries.reduce((acc, e) => acc + (e.clicks ?? 0), 0)
}

export function daysInRangeInclusive(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

export type Kpis = {
  totalMicros: number
  impressions: number
  clicks: number
  avgDailyMicros: number
  cpcMicros: number
  activeCampaigns: number
}

export function computeKpis(entries: BudgetEntry[], from: string, to: string): Kpis {
  const totalMicros = sumMicros(entries)
  const impressions = sumImpressions(entries)
  const clicks = sumClicks(entries)
  const days = daysInRangeInclusive(from, to)
  const distinctCampaigns = new Set(entries.filter((e) => e.spend_micros > 0).map((e) => e.campaign_external_id))
  return {
    totalMicros,
    impressions,
    clicks,
    avgDailyMicros: totalMicros / days,
    cpcMicros: clicks > 0 ? totalMicros / clicks : 0,
    activeCampaigns: distinctCampaigns.size,
  }
}

// Delta vs the previous equal-length period. null = no prior baseline to compare against.
export function spendDelta(currentMicros: number, priorMicros: number): { pct: number; up: boolean } | null {
  if (priorMicros <= 0) return null
  const pct = (currentMicros - priorMicros) / priorMicros
  return { pct: Math.abs(pct), up: currentMicros >= priorMicros }
}

// ── Caps & pacing ───────────────────────────────────────────────────────────
export function capForScope(caps: BudgetCap[], scope: string): BudgetCap | undefined {
  return caps.find((c) => c.scope === scope)
}

export type Pacing = {
  hasCap: boolean
  mtdMicros: number
  capMicros: number
  pctUsed: number
  projectedMicros: number
  projectedPctOfCap: number
  daysInMonth: number
  dayOfMonth: number
  daysLeft: number
  label: 'On track' | 'Over pace' | 'Under pace' | 'No cap set'
  tone: 'good' | 'bad' | 'neutral'
}

// month-to-date = sum of current-calendar-month entries; projection linearly extrapolates
// the daily run-rate across the month. Uses the supplied `now` so the server page and any
// client recompute agree on "today".
export function computePacing(entries: BudgetEntry[], caps: BudgetCap[], now: Date): Pacing {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const dayOfMonth = now.getUTCDate()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const daysLeft = daysInMonth - dayOfMonth

  const mtdMicros = entries
    .filter((e) => e.entry_date.startsWith(monthPrefix))
    .reduce((acc, e) => acc + e.spend_micros, 0)

  const overallCap = capForScope(caps, 'overall')
  const capMicros = overallCap?.amount_micros ?? 0
  const hasCap = capMicros > 0

  const projectedMicros = dayOfMonth > 0 ? Math.round((mtdMicros / dayOfMonth) * daysInMonth) : 0
  const pctUsed = hasCap ? mtdMicros / capMicros : 0
  const projectedPctOfCap = hasCap ? projectedMicros / capMicros : 0

  let label: Pacing['label'] = 'No cap set'
  let tone: Pacing['tone'] = 'neutral'
  if (hasCap) {
    if (projectedMicros > capMicros) {
      label = 'Over pace'
      tone = 'bad'
    } else if (projectedMicros >= capMicros * 0.95) {
      label = 'On track'
      tone = 'good'
    } else {
      label = 'Under pace'
      tone = 'neutral'
    }
  }

  return {
    hasCap,
    mtdMicros,
    capMicros,
    pctUsed,
    projectedMicros,
    projectedPctOfCap,
    daysInMonth,
    dayOfMonth,
    daysLeft,
    label,
    tone,
  }
}

export function monthName(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  })
}

export function clampPct(fraction: number): string {
  return `${Math.min(100, Math.max(0, fraction * 100)).toFixed(1)}%`
}

// ── Daily series for the area chart ───────────────────────────────────────────
export type DailyPoint = { date: string; micros: number }

export function dailySeries(entries: BudgetEntry[], from: string, to: string): DailyPoint[] {
  const byDate = new Map<string, number>()
  for (const e of entries) byDate.set(e.entry_date, (byDate.get(e.entry_date) ?? 0) + e.spend_micros)

  const points: DailyPoint[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    points.push({ date: key, micros: byDate.get(key) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return points
}

export type ChartGeometry = {
  linePath: string
  areaPath: string
  maxMicros: number
  gridLines: { y: number; label: string }[]
  xLabels: { index: number; label: string }[]
}

// Maps a daily series into an SVG path over the design's 0..width / 0..height viewBox.
export function buildChartGeometry(
  points: DailyPoint[],
  currency: string,
  width = 680,
  height = 190
): ChartGeometry {
  const maxMicros = Math.max(1, ...points.map((p) => p.micros))
  const n = points.length
  const x = (i: number): number => (n <= 1 ? width / 2 : (i / (n - 1)) * width)
  const y = (micros: number): number => height - (micros / maxMicros) * (height - 8) - 4

  let linePath = ''
  points.forEach((p, i) => {
    linePath += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.micros).toFixed(1)}`
  })
  const areaPath = n
    ? `${linePath}L${x(n - 1).toFixed(1)} ${height}L${x(0).toFixed(1)} ${height}Z`
    : ''

  const gridLines = [0, 0.5, 1].map((f) => ({
    y: height - f * (height - 8) - 4,
    label: formatMoneyMicros(maxMicros * f, currency, { compact: true }),
  }))

  const labelCount = Math.min(5, n)
  const xLabels = Array.from({ length: labelCount }, (_, k) => {
    const index = labelCount <= 1 ? 0 : Math.round((k / (labelCount - 1)) * (n - 1))
    return { index, label: shortDate(points[index]?.date ?? '') }
  })

  return { linePath, areaPath, maxMicros, gridLines, xLabels }
}

export function shortDate(iso: string): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diffMs = Date.now() - Date.parse(iso)
  if (diffMs < 0) return 'just now'
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Per-platform totals for the donut + legend ────────────────────────────────
export type PlatformTotal = {
  platform: string
  name: string
  color: string
  micros: number
  share: number
  connected: boolean
}

export function platformTotals(entries: BudgetEntry[], connections: PlatformConnectionPublic[]): PlatformTotal[] {
  const connectedPlatforms = new Set(connections.map((c) => c.platform))
  const byPlatform = new Map<string, number>()
  for (const e of entries) byPlatform.set(e.platform, (byPlatform.get(e.platform) ?? 0) + e.spend_micros)
  for (const p of connectedPlatforms) if (!byPlatform.has(p)) byPlatform.set(p, 0)

  const total = Array.from(byPlatform.values()).reduce((a, b) => a + b, 0)
  return Array.from(byPlatform.entries())
    .map(([platform, micros]) => ({
      platform,
      name: platformLabel(platform),
      color: platformColor(platform),
      micros,
      share: total > 0 ? micros / total : 0,
      connected: connectedPlatforms.has(platform),
    }))
    .sort((a, b) => b.micros - a.micros)
}

// ── Per-campaign aggregation for the table + drawer ───────────────────────────
export type CampaignRow = {
  campaignId: string
  name: string
  platform: string
  currency: string
  spendMicros: number
  impressions: number
  clicks: number
  ctr: number
  cpcMicros: number
}

export function campaignRows(entries: BudgetEntry[]): CampaignRow[] {
  const byCampaign = new Map<string, BudgetEntry[]>()
  for (const e of entries) {
    const list = byCampaign.get(e.campaign_external_id)
    if (list) list.push(e)
    else byCampaign.set(e.campaign_external_id, [e])
  }

  return Array.from(byCampaign.entries()).map(([campaignId, rows]) => {
    const spendMicros = sumMicros(rows)
    const impressions = sumImpressions(rows)
    const clicks = sumClicks(rows)
    return {
      campaignId,
      name: rows[0]?.campaign_name ?? campaignId,
      platform: rows[0]?.platform ?? 'meta',
      currency: rows[0]?.currency ?? 'USD',
      spendMicros,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cpcMicros: clicks > 0 ? spendMicros / clicks : 0,
    }
  })
}
