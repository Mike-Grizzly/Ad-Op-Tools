import type {
  AdPlatformClient,
  CanonicalCampaign,
  CanonicalSpendRow,
  DateRange,
} from '@/types/integrations'
import type { MetaAccount, MetaCampaign, MetaErrorBody, MetaInsight, MetaListResponse } from './types'
import { toCanonicalCampaign, toCanonicalSpendRow } from './transforms'
import {
  CAMPAIGNS_PAGE_LIMIT,
  INSIGHTS_PAGE_LIMIT,
  MAX_RETRIES,
  META_API_VERSION,
} from './constants'

const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

// Typed Graph API error so callers can branch: a dead token must flip the connection to
// expired/revoked (not retry forever); throttling must back off; transient 5xx may retry.
export class MetaApiError extends Error {
  readonly code: number | undefined
  readonly subcode: number | undefined
  readonly httpStatus: number
  readonly fbtraceId: string | undefined

  constructor(
    message: string,
    opts: { code?: number; subcode?: number; httpStatus: number; fbtraceId?: string }
  ) {
    super(message)
    this.name = 'MetaApiError'
    this.code = opts.code
    this.subcode = opts.subcode
    this.httpStatus = opts.httpStatus
    this.fbtraceId = opts.fbtraceId
  }

  // OAuth token expired/invalid/revoked — caller marks the connection expired.
  get isAuthError(): boolean {
    return this.code === 190 || this.code === 102 || this.httpStatus === 401
  }

  // Rate/throttle limits (app, user, page, and ad-account BUC throttling).
  get isRateLimited(): boolean {
    if (this.httpStatus === 429) return true
    const c = this.code
    if (c === undefined) return false
    return c === 4 || c === 17 || c === 32 || c === 613 || (c >= 80000 && c <= 80004)
  }

  get isTransient(): boolean {
    return this.httpStatus >= 500 || this.code === 1 || this.code === 2
  }
}

// Meta ad account paths use `act_<numeric id>`; accept either stored shape, reject garbage.
function actPath(accountId: string): string {
  const raw = accountId.startsWith('act_') ? accountId.slice(4) : accountId
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid Meta ad account id: ${accountId}`)
  }
  return `act_${raw}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      const retryable = err instanceof MetaApiError && (err.isRateLimited || err.isTransient)
      if (!retryable || attempt >= MAX_RETRIES) throw err
      const backoff = Math.min(1000 * 2 ** attempt, 16000) + Math.floor(Math.random() * 250)
      attempt += 1
      await sleep(backoff)
    }
  }
}

// Token goes in the Authorization header (never the URL/query) so it can't leak via logs.
async function metaGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  // Graph can return HTTP 200 with an error body (some throttle cases), so check both.
  const raw: unknown = await res.json().catch(() => ({}))
  const errorBody = raw as MetaErrorBody
  if (!res.ok || errorBody.error) {
    const e = errorBody.error ?? {}
    throw new MetaApiError(e.message ?? `Meta API error (${res.status})`, {
      code: e.code,
      subcode: e.error_subcode,
      httpStatus: res.status,
      fbtraceId: e.fbtrace_id,
    })
  }
  return raw as T
}

async function metaGetAll<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>
): Promise<T[]> {
  const out: T[] = []
  let after: string | undefined
  for (;;) {
    const page = await withRetry(() =>
      metaGet<MetaListResponse<T>>(path, accessToken, after ? { ...params, after } : params)
    )
    out.push(...page.data)
    if (page.paging?.next && page.paging.cursors?.after) {
      after = page.paging.cursors.after
    } else {
      return out
    }
  }
}

export function createMetaClient(accessToken: string): AdPlatformClient {
  // Ad account currency is immutable; fetch once per account per client instance.
  const currencyByAccount = new Map<string, string>()

  async function accountCurrency(accountId: string): Promise<string> {
    const path = actPath(accountId)
    const cached = currencyByAccount.get(path)
    if (cached) return cached
    const account = await withRetry(() =>
      metaGet<MetaAccount>(path, accessToken, { fields: 'currency' })
    )
    currencyByAccount.set(path, account.currency)
    return account.currency
  }

  return {
    platform: 'meta',

    async listCampaigns(accountId: string): Promise<CanonicalCampaign[]> {
      const campaigns = await metaGetAll<MetaCampaign>(
        `${actPath(accountId)}/campaigns`,
        accessToken,
        { fields: 'id,name,status', limit: String(CAMPAIGNS_PAGE_LIMIT) }
      )
      return campaigns.map((c) => toCanonicalCampaign(c, accountId))
    },

    async getDailySpend(accountId: string, range: DateRange): Promise<CanonicalSpendRow[]> {
      const currency = await accountCurrency(accountId)
      const insights = await metaGetAll<MetaInsight>(
        `${actPath(accountId)}/insights`,
        accessToken,
        {
          level: 'campaign',
          time_increment: '1',
          // date_start/date_stop are dimensions — must be requested explicitly or rows
          // come back with no date.
          fields: 'campaign_id,campaign_name,spend,impressions,clicks,date_start,date_stop',
          time_range: JSON.stringify({ since: range.from, until: range.to }),
          limit: String(INSIGHTS_PAGE_LIMIT),
        }
      )
      return insights.map((i) => toCanonicalSpendRow(i, accountId, currency))
    },
  }
}
