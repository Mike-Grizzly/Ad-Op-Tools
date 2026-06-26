// Canonical, platform-agnostic types shared by every ad-platform integration.
// Each platform's transforms.ts maps its native API responses into these shapes,
// so consumers (Budget Dashboard, Reporting) stay platform-blind.

export type AdPlatform = 'meta' | 'google_ads' | 'linkedin' | 'tiktok'

export type PlatformConnectionStatus = 'connected' | 'expired' | 'error' | 'revoked'

// ISO calendar dates (YYYY-MM-DD), inclusive on both ends.
export type DateRange = {
  from: string
  to: string
}

export type CanonicalCampaign = {
  platform: AdPlatform
  account_id: string
  external_id: string
  name: string
  status: string | null
}

// Money is stored as integer minor units (micros: 1,000,000 micros = 1 currency
// unit, matching Google's native cost_micros) with an explicit currency — never
// floats; see docs/decision-log.md. Field names mirror the budget_entries columns
// so an upsert needs no renaming.
export type CanonicalSpendRow = {
  platform: AdPlatform
  account_id: string
  campaign_external_id: string
  campaign_name: string
  date: string
  spend_micros: number
  currency: string
  impressions: number | null
  clicks: number | null
}

// Extension contract implemented once per platform (interface, not type, per the
// TypeScript conventions). Read-only by design: write methods (creative upload/
// clone) are added in Phase 4 when a real consumer needs them, not speculatively.
export interface AdPlatformClient {
  readonly platform: AdPlatform
  listCampaigns(accountId: string): Promise<CanonicalCampaign[]>
  getDailySpend(accountId: string, range: DateRange): Promise<CanonicalSpendRow[]>
}
