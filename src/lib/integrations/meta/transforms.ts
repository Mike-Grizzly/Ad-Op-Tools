import type { AdPlatform, CanonicalCampaign, CanonicalSpendRow } from '@/types/integrations'
import type { MetaCampaign, MetaInsight } from './types'

const PLATFORM: AdPlatform = 'meta'

// Meta returns spend as a decimal string in the account currency (e.g. "12.34", or "-1.50"
// for credits). Convert to integer micros (1,000,000 micros = 1 unit) by building the integer
// string directly — never float multiplication — so there is no drift even for large spends.
// Up to 6 decimal places are preserved.
export function spendToMicros(spend: string | undefined): number {
  if (!spend) return 0
  const trimmed = spend.trim()
  const negative = trimmed.startsWith('-')
  const [whole = '0', frac = ''] = trimmed.replace(/^-/, '').split('.')
  const micros = Number(`${whole}${(frac + '000000').slice(0, 6)}`)
  return negative ? -micros : micros
}

function toIntOrNull(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

export function toCanonicalCampaign(
  campaign: MetaCampaign,
  externalAccountId: string
): CanonicalCampaign {
  return {
    platform: PLATFORM,
    external_account_id: externalAccountId,
    external_id: campaign.id,
    name: campaign.name,
    status: campaign.status ?? null,
  }
}

export function toCanonicalSpendRow(
  insight: MetaInsight,
  externalAccountId: string,
  currency: string
): CanonicalSpendRow {
  return {
    platform: PLATFORM,
    external_account_id: externalAccountId,
    campaign_external_id: insight.campaign_id,
    campaign_name: insight.campaign_name,
    entry_date: insight.date_start,
    spend_micros: spendToMicros(insight.spend),
    currency,
    impressions: toIntOrNull(insight.impressions),
    clicks: toIntOrNull(insight.clicks),
  }
}
