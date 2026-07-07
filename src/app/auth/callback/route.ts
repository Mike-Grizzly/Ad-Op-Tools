import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // `next` is attacker-controllable; accept it only as a same-origin relative path.
  // A value like `@evil.com` or `//evil.com` would otherwise redirect off-origin (open redirect).
  const rawNext = searchParams.get('next')
  const next =
    rawNext && /^\/(?!\/)/.test(rawNext) && !rawNext.includes('://') && !rawNext.includes('@')
      ? rawNext
      : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
