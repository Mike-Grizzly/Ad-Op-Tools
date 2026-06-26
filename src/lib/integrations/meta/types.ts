// Raw Meta Marketing API (Graph) response shapes. Mapped to canonical types in transforms.ts.

export type MetaCampaign = {
  id: string
  name: string
  status: string
}

// Spend/metrics are returned as decimal strings in the ad account's currency.
export type MetaInsight = {
  campaign_id: string
  campaign_name: string
  spend?: string
  impressions?: string
  clicks?: string
  date_start: string // YYYY-MM-DD
  date_stop: string
}

export type MetaAccount = {
  id: string
  currency: string
}

export type MetaListResponse<T> = {
  data: T[]
  paging?: {
    cursors?: { before?: string; after?: string }
    next?: string
  }
}

export type MetaErrorBody = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}
