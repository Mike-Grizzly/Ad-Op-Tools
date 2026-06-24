import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/features/auth/sign-out-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <nav className="flex w-56 shrink-0 flex-col bg-white border-r border-gray-200 px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Ad Op Tools</p>
        <ul className="space-y-1 flex-1">
          <li><a href="/dashboard" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</a></li>
          <li><a href="/utm" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">UTM Generator</a></li>
          <li><a href="/budget" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Budget</a></li>
          <li><a href="/campaigns" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Campaigns</a></li>
          <li><a href="/creative" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Creative</a></li>
          <li><a href="/reports" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Reports</a></li>
        </ul>
        <div className="border-t border-gray-200 pt-4">
          <p className="truncate px-3 text-xs text-gray-400 mb-2">{user.email}</p>
          <SignOutButton />
        </div>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
