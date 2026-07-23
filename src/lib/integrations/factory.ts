import type { AdPlatform } from '@/types/integrations'
import type { AdPlatformClient } from '@/types/integrations'
import { createMetaClient } from './meta/client'
import { PlatformNotConfiguredError, UnsupportedPlatformError } from './errors'
import type { ConnectionWithTokens } from './connections'

// The single dispatch seam between stored connections and platform API clients.
// Each branch assembles its own app-level credentials internally, so callers
// (sync-core, future cron) stay platform-blind. Adding Google Ads means adding a
// case here — nothing at the call sites changes.

// Read per call rather than snapshotted: after assertPlatformReady passes, the throw
// here is unreachable in a sync loop (Node env vars can't vanish mid-request). If a
// future platform resolves per-call credentials that CAN fail mid-loop (e.g. rotated
// tokens), resolve them once up front and thread them through — a config failure must
// not be misclassified as a per-connection error.
function requireMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET
  if (!secret) throw new PlatformNotConfiguredError('meta')
  return secret
}

export function getClientForConnection(conn: ConnectionWithTokens): AdPlatformClient {
  switch (conn.platform) {
    case 'meta':
      return createMetaClient(conn.accessToken, requireMetaAppSecret())
    default:
      throw new UnsupportedPlatformError(conn.platform)
  }
}

// Preflight for sync flows: today's user-facing error ordering depends on the
// platform-support check and the env check both running BEFORE any connection
// lookup ("Only Meta is supported" must win over "No connection found"). The
// support check precedes the config check — that ordering is behavior.
export function assertPlatformReady(platform: AdPlatform): void {
  if (platform !== 'meta') throw new UnsupportedPlatformError(platform)
  requireMetaAppSecret()
}
