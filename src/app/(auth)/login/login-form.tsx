'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(true)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    border: '1px solid #e1e4e9',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#161922',
    background: '#fbfbfc',
    outline: 'none',
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e9ebef', borderRadius: 16, padding: 28, boxShadow: '0 12px 40px -12px rgba(22,25,34,.12)' }}>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>Sign in</div>
      <div style={{ fontSize: 13.5, color: '#8a909b', marginBottom: 22, fontWeight: 500 }}>
        Welcome back. Enter your credentials to continue.
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fef2f2', border: '1px solid #fecdd3', color: '#b42318', borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><path d="M12 16h.01" />
          </svg>
          <span>Incorrect email or password. Please try again.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(false) }}
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false) }}
          style={{ ...inputStyle, marginBottom: 22 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: '#4f46e5', color: '#fff', fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
