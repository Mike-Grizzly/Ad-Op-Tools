import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(1100px 600px at 50% -10%, #eef0fb 0%, #f6f7f9 55%)' }}>
      <div style={{ width: '100%', maxWidth: 404 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(79,70,229,.35)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M15 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: '#161922' }}>Ad Op Tools</div>
            <div style={{ fontSize: 12.5, color: '#8a909b', fontWeight: 500 }}>Campaign operations workspace</div>
          </div>
        </div>
        <LoginForm />
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9aa0aa', marginTop: 18, fontWeight: 500 }}>
          Invite-only access · Contact your admin for an invitation
        </div>
      </div>
    </div>
  )
}
