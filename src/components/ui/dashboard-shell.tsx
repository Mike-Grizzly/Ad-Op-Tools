'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/features/auth/actions'

type Props = {
  userEmail: string
  children: React.ReactNode
}

const NAV = [
  {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    id: 'utm',
    href: '/utm',
    label: 'UTM Generator',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
        <path d="M15 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
      </svg>
    ),
  },
  {
    id: 'budget',
    href: '/budget',
    label: 'Budget Dashboard',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" /><path d="M16.5 6.5c-1-1-2.7-1.5-4.5-1.5-2.8 0-4.5 1.2-4.5 3.2 0 4.8 9 2.3 9 7.1 0 2-1.9 3.2-4.5 3.2-1.9 0-3.6-.6-4.6-1.7" />
      </svg>
    ),
  },
  {
    id: 'clients',
    href: '/clients',
    label: 'Clients',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7.5" width="18" height="13" rx="2.5" />
        <path d="M8.5 7.5V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
        <path d="M3 13h18" />
      </svg>
    ),
  },
  {
    id: 'campaigns',
    href: '/campaigns',
    label: 'Campaigns',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11v2a1 1 0 0 0 1 1h2.5L11 18.5V5.5L6.5 10H4a1 1 0 0 0-1 1Z" />
        <path d="M15 8.5a4 4 0 0 1 0 7" /><path d="M18 5.5a8 8 0 0 1 0 13" />
      </svg>
    ),
  },
  {
    id: 'creative',
    href: '/creative',
    label: 'Creative Assets',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="8.5" cy="9.5" r="1.6" />
        <path d="m4 17 4.5-4.5a1.6 1.6 0 0 1 2.3 0L16 18" />
        <path d="m14 15 1.8-1.8a1.6 1.6 0 0 1 2.3 0L20 15" />
      </svg>
    ),
  },
  {
    id: 'reports',
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16" />
        <rect x="6" y="11" width="3" height="6" rx="1" />
        <rect x="11" y="7" width="3" height="10" rx="1" />
        <rect x="16" y="13" width="3" height="4" rx="1" />
      </svg>
    ),
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/utm': 'UTM Generator',
  '/budget': 'Budget Dashboard',
  '/clients': 'Clients',
  '/campaigns': 'Campaigns',
  '/creative': 'Creative Assets',
  '/reports': 'Reports',
}

export function DashboardShell({ userEmail, children }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const pageTitle = PAGE_TITLES[pathname] ?? 'Ad Op Tools'
  const initials = userEmail.slice(0, 2).toUpperCase()
  const sidebarWidth = collapsed ? '76px' : '248px'

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#f6f7f9', color: '#161922', fontFamily: 'var(--font-sans)' }}>

      {/* Sidebar */}
      <aside style={{ width: sidebarWidth, flexShrink: 0, background: '#10121a', display: 'flex', flexDirection: 'column', padding: '16px 12px', transition: 'width 0.18s ease', overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 6px 4px 6px', height: 42 }}>
          <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M15 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
          </div>
          {!collapsed && (
            <span style={{ fontSize: 15.5, fontWeight: 800, color: '#f5f6f8', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              Ad Op Tools
            </span>
          )}
        </div>

        {/* Nav label */}
        {!collapsed ? (
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', color: '#565d6b', padding: '18px 8px 8px', textTransform: 'uppercase' }}>
            Menu
          </div>
        ) : (
          <div style={{ height: 18 }} />
        )}

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  textDecoration: 'none',
                  borderRadius: 9,
                  overflow: 'hidden',
                }}
              >
                {active && (
                  <>
                    <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)', borderRadius: 9 }} />
                    <span style={{ position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, background: '#4f46e5', borderRadius: '0 3px 3px 0' }} />
                  </>
                )}
                <span style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  color: active ? '#f5f6f8' : '#9aa1ad',
                  fontWeight: active ? 600 : 500,
                }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6 }}>
            <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#262a36', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#c8ccd4' }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e4e6ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userEmail}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <header style={{ height: 62, flexShrink: 0, background: '#fff', borderBottom: '1px solid #e9ebef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <button
              onClick={() => setCollapsed((c) => !c)}
              title="Toggle sidebar"
              style={{ width: 34, height: 34, flexShrink: 0, border: '1px solid #e9ebef', background: '#fff', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b626e' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
              </svg>
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pageTitle}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: '#6b727f', fontWeight: 500 }}>{userEmail}</span>
            <form action={signOut}>
              <button
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #e9ebef', background: '#fff', borderRadius: 9, padding: '7px 13px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#4b5563', cursor: 'pointer' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
