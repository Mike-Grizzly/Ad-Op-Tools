import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveConnection } from '@/lib/integrations/connections'
import { META_API_VERSION } from '@/lib/integrations/meta/constants'

const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`
const META_SCOPES = ['ads_read']
const STATE_COOKIE = 'meta_oauth_state'

type TokenResponse = { access_token?: string; expires_in?: number }
type AdAccount = { account_id: string; name?: string; currency?: string }
type AdAccountsResponse = { data?: AdAccount[] }

function fail(request: NextRequest, reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/budget?error=${reason}`, request.url))
}

// Completes the Meta OAuth flow: validate CSRF state, exchange the code for a long-lived
// token, then save a connection for each ad account the user granted.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { searchParams } = request.nextUrl
  if (searchParams.get('error')) return fail(request, 'meta_denied')

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(STATE_COOKIE)?.value
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail(request, 'meta_state_mismatch')
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return fail(request, 'meta_not_configured')

  const redirectUri = new URL('/api/integrations/meta/callback', request.url).toString()

  try {
    // 1. code -> short-lived token
    const shortUrl = new URL(`${GRAPH}/oauth/access_token`)
    shortUrl.searchParams.set('client_id', appId)
    shortUrl.searchParams.set('client_secret', appSecret)
    shortUrl.searchParams.set('redirect_uri', redirectUri)
    shortUrl.searchParams.set('code', code)
    const shortRes = await fetch(shortUrl, { headers: { Accept: 'application/json' } })
    const shortJson = (await shortRes.json()) as TokenResponse
    if (!shortRes.ok || !shortJson.access_token) return fail(request, 'meta_token_exchange')

    // 2. short-lived -> long-lived token (~60 days)
    const longUrl = new URL(`${GRAPH}/oauth/access_token`)
    longUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longUrl.searchParams.set('client_id', appId)
    longUrl.searchParams.set('client_secret', appSecret)
    longUrl.searchParams.set('fb_exchange_token', shortJson.access_token)
    const longRes = await fetch(longUrl, { headers: { Accept: 'application/json' } })
    const longJson = (await longRes.json()) as TokenResponse
    const accessToken = longJson.access_token ?? shortJson.access_token
    const tokenExpiresAt = longJson.expires_in
      ? new Date(Date.now() + longJson.expires_in * 1000).toISOString()
      : null

    // 3. list ad accounts and save a connection per account
    const acctUrl = new URL(`${GRAPH}/me/adaccounts`)
    acctUrl.searchParams.set('fields', 'account_id,name,currency')
    const acctRes = await fetch(acctUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    const acctJson = (await acctRes.json()) as AdAccountsResponse
    if (!acctRes.ok || !acctJson.data || acctJson.data.length === 0) {
      return fail(request, 'meta_no_accounts')
    }

    for (const acct of acctJson.data) {
      await saveConnection({
        platform: 'meta',
        externalAccountId: acct.account_id,
        accountName: acct.name ?? null,
        scopes: META_SCOPES,
        accessToken,
        tokenExpiresAt,
      })
    }
  } catch {
    return fail(request, 'meta_connect_failed')
  }

  const res = NextResponse.redirect(new URL('/budget?connected=meta', request.url))
  res.cookies.delete(STATE_COOKIE)
  return res
}
