import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const firstName = user?.email?.split('@')[0] ?? 'there'

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 58, height: 58, borderRadius: 15, background: '#fff', border: '1px solid #e9ebef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', margin: '0 auto 18px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Welcome back, {firstName}
        </h2>
        <p style={{ fontSize: 14.5, color: '#6b727f', margin: 0, lineHeight: 1.55 }}>
          Your campaign operations hub. Jump into the UTM Generator from the sidebar to build trackable links.
        </p>
      </div>
    </div>
  )
}
