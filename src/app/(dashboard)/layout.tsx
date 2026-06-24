import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <nav className="w-56 shrink-0 bg-white border-r border-gray-200 px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Ad Op Tools</p>
        <ul className="space-y-1">
          <li><a href="/dashboard" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</a></li>
          <li><a href="/utm" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">UTM Generator</a></li>
          <li><a href="/budget" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Budget</a></li>
          <li><a href="/campaigns" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Campaigns</a></li>
          <li><a href="/creative" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Creative</a></li>
          <li><a href="/reports" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Reports</a></li>
        </ul>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
