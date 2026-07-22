import { getClients, getClientPlatforms } from '@/features/clients/queries'
import { getConnections, getBudgetEntries } from '@/features/budget/queries'
import { CLIENT_ENTRIES_LOOKBACK_DAYS } from '@/features/clients/constants'
import { ClientsPageClient } from '@/features/clients/components/clients-page-client'
import type { DateRange } from '@/types/integrations'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default async function ClientsPage() {
  const now = new Date()
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - CLIENT_ENTRIES_LOOKBACK_DAYS)
  const lookbackRange: DateRange = { from: isoDate(from), to: isoDate(now) }

  const [clients, overrides, connections, entries] = await Promise.all([
    getClients(),
    getClientPlatforms(),
    getConnections(),
    getBudgetEntries(lookbackRange),
  ])

  return (
    <ClientsPageClient
      clients={clients}
      overrides={overrides}
      connections={connections}
      entries={entries}
      nowIso={now.toISOString()}
    />
  )
}
