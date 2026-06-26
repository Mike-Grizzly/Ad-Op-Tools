import type {
  AdPlatformClient,
  CanonicalCampaign,
  CanonicalSpendRow,
  DateRange,
} from '@/types/integrations'
import type { MetaAccount, MetaCampaign, MetaInsight, MetaListResponse } from './types'
import { toCanonicalCampaign, toCanonicalSpendRow } from './transforms'

const API_VERSION = 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

// Meta ad account paths use the `act_<id>` form; accept either stored shape.
function actPath(accountId: string): string {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`
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
  const body = await res.json()
  if (!res.ok) {
    const message = body?.error?.message ?? `Meta API error (${res.status})`
    throw new Error(`Meta API: ${message}`)
  }
  return body as T
}

async function metaGetAll<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>
): Promise<T[]> {
  const out: T[] = []
  let after: string | undefined
  for (;;) {
    const page = await metaGet<MetaListResponse<T>>(
      path,
      accessToken,
      after ? { ...params, after } : params
    )
    out.push(...page.data)
    if (page.paging?.next && page.paging.cursors?.after) {
      after = page.paging.cursors.after
    } else {
      return out
    }
  }
}

async function getAccountCurrency(accountId: string, accessToken: string): Promise<string> {
  const account = await metaGet<MetaAccount>(actPath(accountId), accessToken, { fields: 'currency' })
  return account.currency
}

export function createMetaClient(accessToken: string): AdPlatformClient {
  return {
    platform: 'meta',

    async listCampaigns(accountId: string): Promise<CanonicalCampaign[]> {
      const campaigns = await metaGetAll<MetaCampaign>(
        `${actPath(accountId)}/campaigns`,
        accessToken,
        { fields: 'id,name,status', limit: '200' }
      )
      return campaigns.map((c) => toCanonicalCampaign(c, accountId))
    },

    async getDailySpend(accountId: string, range: DateRange): Promise<CanonicalSpendRow[]> {
      const currency = await getAccountCurrency(accountId, accessToken)
      const insights = await metaGetAll<MetaInsight>(
        `${actPath(accountId)}/insights`,
        accessToken,
        {
          level: 'campaign',
          time_increment: '1',
          fields: 'campaign_id,campaign_name,spend,impressions,clicks',
          time_range: JSON.stringify({ since: range.from, until: range.to }),
          limit: '500',
        }
      )
      return insights.map((i) => toCanonicalSpendRow(i, accountId, currency))
    },
  }
}
