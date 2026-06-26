import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { META_API_VERSION, META_SCOPES } from '@/lib/integrations/meta/constants'

const STATE_COOKIE = 'meta_oauth_state'

// Starts the Meta OAuth flow: set a CSRF state cookie and redirect to Meta's consent dialog.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const appId = process.env.META_APP_ID
  const appOrigin = process.env.APP_ORIGIN
  // redirect_uri must be built from a trusted fixed origin, never from request headers
  // (prevents host-header injection of the redirect target).
  if (!appId || !appOrigin) {
    return NextResponse.redirect(new URL('/budget?error=meta_not_configured', request.url))
  }

  const state = randomBytes(16).toString('hex')
  const redirectUri = new URL('/api/integrations/meta/callback', appOrigin).toString()

  const dialog = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`)
  dialog.searchParams.set('client_id', appId)
  dialog.searchParams.set('redirect_uri', redirectUri)
  dialog.searchParams.set('state', state)
  dialog.searchParams.set('scope', META_SCOPES.join(','))

  const res = NextResponse.redirect(dialog.toString())
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
