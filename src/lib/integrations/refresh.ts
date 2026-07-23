import type { AdPlatform } from '@/types/integrations'
import type { ConnectionWithTokens } from './connections'

// Token refresh lifecycle (blueprint §3.4). Pure decision logic + the per-platform
// refresher registry, kept out of connections.ts so it is unit-testable without a
// session. connections.ts owns all token reads/writes; this module never touches
// the database — persistence is injected.

// Refresh BEFORE expiry so a token can't die mid-request between our check and the
// platform receiving the call.
export const REFRESH_SKEW_MS = 5 * 60_000

export type RefreshedTokens = {
  accessToken: string
  // undefined = platform did not return a new refresh token; keep the stored one.
  refreshToken?: string | null
  tokenExpiresAt: string | null
}

export type TokenRefresher = (conn: ConnectionWithTokens) => Promise<RefreshedTokens>

// Meta is deliberately absent: its long-lived tokens (~60 days) have no silent
// refresh path — expiry means the user must reconnect. google_ads slots in here
// next slice (hourly access tokens + offline refresh token).
const REFRESHERS: Partial<Record<AdPlatform, TokenRefresher>> = {}

export function getRefresher(platform: string): TokenRefresher | null {
  return REFRESHERS[platform as AdPlatform] ?? null
}

// An unparseable timestamp yields NaN comparisons → false → passthrough: the sync
// call then fails as an auth error and marks the connection, same as before this
// seam existed. Null expiry (platform never told us) also passes through.
export function needsRefresh(tokenExpiresAt: string | null, nowMs: number): boolean {
  if (tokenExpiresAt === null) return false
  return Date.parse(tokenExpiresAt) - nowMs <= REFRESH_SKEW_MS
}

export type FreshenDeps = {
  refresherFor: (platform: string) => TokenRefresher | null
  persist: (tokens: RefreshedTokens) => Promise<void>
  markExpired: () => Promise<void>
  now: () => number
}

// Returns the connection ready to use, or null when it cannot be made usable
// (expired with no refresh path, or refresh failed) — the connection is marked
// 'expired' first so the UI shows "reconnect". A persist failure propagates:
// silently syncing with a token we failed to store would hide a broken write path.
export async function freshen(
  conn: ConnectionWithTokens,
  deps: FreshenDeps
): Promise<ConnectionWithTokens | null> {
  // Revocation is authoritative: a successful refresh must never resurrect a
  // connection someone deliberately shut off, even if the upstream grant is
  // still live. ('expired'/'error' may recover — that's the point of refresh.)
  if (conn.status === 'revoked') return null
  if (!needsRefresh(conn.tokenExpiresAt, deps.now())) return conn

  const refresher = deps.refresherFor(conn.platform)
  if (!refresher) {
    await deps.markExpired()
    return null
  }

  let tokens: RefreshedTokens
  try {
    tokens = await refresher(conn)
  } catch {
    await deps.markExpired()
    return null
  }

  await deps.persist(tokens)
  return {
    ...conn,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? conn.refreshToken,
    tokenExpiresAt: tokens.tokenExpiresAt,
    status: 'connected',
  }
}
