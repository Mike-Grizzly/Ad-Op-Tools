import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { saveConnections, type SaveConnectionInput } from '@/lib/integrations/connections'
import { META_API_VERSION, META_SCOPES } from '@/lib/integrations/meta/constants'

const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`
const STATE_COOKIE = 'meta_oauth_state'

type TokenResponse = { access_token?: string; expires_in?: number }
type AdAccount = { account_id: string; name?: string; currency?: string }
type AdAccountsResponse = { data?: AdAccount[] }

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

// Completes the Meta OAuth flow: validate CSRF state, exchange the code for a long-lived
// token, then save a connection for each ad account the user granted.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const appOrigin = process.env.APP_ORIGIN

  // Every exit clears the one-time state cookie so a stolen/cached one can't be replayed.
  const done = (path: string): NextResponse => {
    const res = NextResponse.redirect(new URL(path, appOrigin ?? request.url))
    res.cookies.delete(STATE_COOKIE)
    return res
  }

  if (!appId || !appSecret || !appOrigin) return done('/budget?error=meta_not_configured')

  const { searchParams } = request.nextUrl
  if (searchParams.get('error')) return done('/budget?error=meta_denied')

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(STATE_COOKIE)?.value
  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
    return done('/budget?error=meta_state_mismatch')
  }

  const redirectUri = new URL('/api/integrations/meta/callback', appOrigin).toString()

  try {
    // 1. code -> short-lived token. POST keeps client_secret out of the URL (egress logs).
    const shortRes = await fetch(`${GRAPH}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })
    const shortJson = (await shortRes.json()) as TokenResponse
    if (!shortRes.ok || !shortJson.access_token) return done('/budget?error=meta_token_exchange')

    // 2. short-lived -> long-lived token (~60 days). Fail loudly; never silently keep the
    // short token (it would expire in ~1h and confuse the user).
    const longRes = await fetch(`${GRAPH}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortJson.access_token,
      }),
    })
    const longJson = (await longRes.json()) as TokenResponse
    if (!longRes.ok || !longJson.access_token) return done('/budget?error=meta_token_exchange')

    const accessToken = longJson.access_token
    const tokenExpiresAt = longJson.expires_in
      ? new Date(Date.now() + longJson.expires_in * 1000).toISOString()
      : null

    // 3. list ad accounts (appsecret_proof binds the call to our app secret)
    const proof = createHmac('sha256', appSecret).update(accessToken).digest('hex')
    const acctUrl = new URL(`${GRAPH}/me/adaccounts`)
    acctUrl.searchParams.set('fields', 'account_id,name,currency')
    acctUrl.searchParams.set('appsecret_proof', proof)
    const acctRes = await fetch(acctUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    const acctJson = (await acctRes.json()) as AdAccountsResponse
    if (!acctRes.ok || !acctJson.data || acctJson.data.length === 0) {
      return done('/budget?error=meta_no_accounts')
    }

    // 4. save all accounts in one atomic upsert
    const inputs: SaveConnectionInput[] = acctJson.data.map((acct) => ({
      platform: 'meta',
      externalAccountId: acct.account_id,
      accountName: acct.name ?? null,
      scopes: [...META_SCOPES],
      accessToken,
      tokenExpiresAt,
    }))
    await saveConnections(inputs)
  } catch {
    return done('/budget?error=meta_connect_failed')
  }

  return done('/budget?connected=meta')
}
