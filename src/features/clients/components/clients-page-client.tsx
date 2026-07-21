'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PlatformConnectionPublic, BudgetEntry } from '@/features/budget/queries'
import { createClient, updateClient, deleteClient, assignConnection } from '../actions'
import { computeClientPacing, entriesForClient } from '../pacing'
import type { Client, ClientPlatform } from '../queries'
import type { ClientSort } from '../constants'
import type { CreateClientInput, UpdateClientInput } from '../validation'
import { sortClients, assignedPlatforms, type ClientWithPacing } from './clients-helpers'
import { ClientsSubHeader } from './clients-sub-header'
import { ClientsEmptyState } from './clients-empty-state'
import { ClientCard } from './client-card'
import { ClientDrawer } from './client-drawer'

type Props = {
  clients: Client[]
  overrides: ClientPlatform[]
  connections: PlatformConnectionPublic[]
  entries: BudgetEntry[]
  nowIso: string
}

type Toast = { msg: string; type: 'success' | 'error' }

type DrawerState = { mode: 'create' } | { mode: 'detail'; clientId: string } | null

export function ClientsPageClient({ clients, overrides, connections, entries, nowIso }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sort, setSort] = useState<ClientSort>('at-risk')
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const now = useMemo(() => new Date(nowIso), [nowIso])

  const showToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // ── Derived data ──────────────────────────────────────────────────────────
  const rows = useMemo<ClientWithPacing[]>(
    () =>
      clients.map((client) => ({
        client,
        pacing: computeClientPacing(
          entriesForClient(entries, connections, client.id),
          client,
          overrides.filter((o) => o.client_id === client.id),
          now
        ),
      })),
    [clients, entries, connections, overrides, now]
  )

  const sorted = useMemo(() => sortClients(rows, sort), [rows, sort])

  const detailRow =
    drawer?.mode === 'detail' ? (rows.find((r) => r.client.id === drawer.clientId) ?? null) : null

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreate = useCallback(
    (input: CreateClientInput) => {
      startTransition(async () => {
        const result = await createClient(input)
        if (result.error !== undefined) {
          showToast(result.error, 'error')
          return
        }
        showToast('Client created')
        setDrawer(null)
        router.refresh()
      })
    },
    [router, showToast]
  )

  const handleUpdate = useCallback(
    (input: UpdateClientInput) => {
      startTransition(async () => {
        const result = await updateClient(input)
        if (result.error !== undefined) {
          showToast(result.error, 'error')
          return
        }
        showToast('Client updated')
        router.refresh()
      })
    },
    [router, showToast]
  )

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteClient(id)
        if (result.error !== undefined) {
          showToast(result.error, 'error')
          return
        }
        showToast('Client deleted')
        setDrawer(null)
        router.refresh()
      })
    },
    [router, showToast]
  )

  const handleAssign = useCallback(
    (connectionId: string, clientId: string | null) => {
      startTransition(async () => {
        const result = await assignConnection({ connectionId, clientId })
        if (result.error !== undefined) {
          showToast(result.error, 'error')
          return
        }
        showToast(clientId ? 'Account assigned' : 'Account unassigned')
        router.refresh()
      })
    },
    [router, showToast]
  )

  const handleCloseDrawer = useCallback(() => setDrawer(null), [])
  const handleOpenCreate = useCallback(() => setDrawer({ mode: 'create' }), [])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 32px 90px' }}>
        <ClientsSubHeader
          showControls={clients.length > 0}
          sort={sort}
          onSortChange={setSort}
          onAdd={handleOpenCreate}
        />

        {clients.length === 0 ? (
          <ClientsEmptyState onAdd={handleOpenCreate} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {sorted.map(({ client, pacing }) => (
              <ClientCard
                key={client.id}
                client={client}
                pacing={pacing}
                platforms={assignedPlatforms(connections, client.id)}
                onOpen={() => setDrawer({ mode: 'detail', clientId: client.id })}
              />
            ))}
          </div>
        )}
      </div>

      {drawer?.mode === 'create' && (
        <ClientDrawer mode="create" busy={isPending} onClose={handleCloseDrawer} onCreate={handleCreate} />
      )}
      {detailRow && (
        <ClientDrawer
          key={detailRow.client.id}
          mode="detail"
          client={detailRow.client}
          pacing={detailRow.pacing}
          overrides={overrides.filter((o) => o.client_id === detailRow.client.id)}
          connections={connections}
          busy={isPending}
          onClose={handleCloseDrawer}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAssign={handleAssign}
        />
      )}

      {toast && (
        <div
          className="toast-in"
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#10121a',
            color: '#fff',
            borderRadius: 11,
            padding: '12px 16px',
            boxShadow: '0 14px 40px -10px rgba(0,0,0,.4)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: toast.type === 'success' ? '#22c55e' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {toast.type === 'success' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            )}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
