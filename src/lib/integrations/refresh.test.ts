import { describe, expect, it } from 'vitest'
import {
  REFRESH_SKEW_MS,
  freshen,
  getRefresher,
  needsRefresh,
  type FreshenDeps,
  type RefreshedTokens,
} from './refresh'
import type { ConnectionWithTokens } from './connections'

const NOW = Date.parse('2026-07-23T12:00:00Z')

function conn(overrides: Partial<ConnectionWithTokens> = {}): ConnectionWithTokens {
  return {
    id: 'conn-1',
    platform: 'meta',
    externalAccountId: 'acct-1',
    accountName: null,
    scopes: [],
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    tokenExpiresAt: new Date(NOW + 60 * 60_000).toISOString(),
    status: 'connected',
    ...overrides,
  }
}

function deps(overrides: Partial<FreshenDeps> = {}) {
  const persisted: RefreshedTokens[] = []
  const expired: true[] = []
  return {
    refresherFor: () => null,
    persist: async (tokens: RefreshedTokens) => {
      persisted.push(tokens)
    },
    markExpired: async () => {
      expired.push(true)
    },
    now: () => NOW,
    persisted,
    expired,
    ...overrides,
  }
}

describe('needsRefresh', () => {
  it('is false for a null expiry (platform never reported one)', () => {
    expect(needsRefresh(null, NOW)).toBe(false)
  })

  it('is false when expiry is comfortably in the future', () => {
    expect(needsRefresh(new Date(NOW + 60 * 60_000).toISOString(), NOW)).toBe(false)
  })

  it('is true inside the skew window', () => {
    expect(needsRefresh(new Date(NOW + REFRESH_SKEW_MS - 1000).toISOString(), NOW)).toBe(true)
  })

  it('is true exactly at the skew boundary', () => {
    expect(needsRefresh(new Date(NOW + REFRESH_SKEW_MS).toISOString(), NOW)).toBe(true)
  })

  it('is true for an already-expired token', () => {
    expect(needsRefresh(new Date(NOW - 1000).toISOString(), NOW)).toBe(true)
  })

  it('is false for an unparseable timestamp (passthrough — API call surfaces the auth error)', () => {
    expect(needsRefresh('not-a-date', NOW)).toBe(false)
  })
})

describe('getRefresher', () => {
  it('has no refresher for meta (no silent refresh path) or unknown platforms', () => {
    expect(getRefresher('meta')).toBeNull()
    expect(getRefresher('linkedin')).toBeNull()
    expect(getRefresher('something-else')).toBeNull()
  })
})

describe('freshen', () => {
  it('passes a far-from-expiry connection through untouched', async () => {
    const d = deps()
    const c = conn()
    const result = await freshen(c, d)
    expect(result).toBe(c)
    expect(d.persisted).toHaveLength(0)
    expect(d.expired).toHaveLength(0)
  })

  it('marks expired and returns null when near expiry with no refresher', async () => {
    const d = deps()
    const result = await freshen(conn({ tokenExpiresAt: new Date(NOW).toISOString() }), d)
    expect(result).toBeNull()
    expect(d.expired).toHaveLength(1)
    expect(d.persisted).toHaveLength(0)
  })

  it('refreshes, persists, and returns the updated connection', async () => {
    const d = deps({
      refresherFor: () => async () => ({
        accessToken: 'new-access',
        tokenExpiresAt: new Date(NOW + 3600_000).toISOString(),
      }),
    })
    const result = await freshen(conn({ tokenExpiresAt: new Date(NOW).toISOString() }), d)
    expect(result).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'old-refresh', // kept: refresher sent no new one
      tokenExpiresAt: new Date(NOW + 3600_000).toISOString(),
      status: 'connected',
    })
    expect(d.persisted).toHaveLength(1)
    expect(d.persisted[0].accessToken).toBe('new-access')
    expect(d.expired).toHaveLength(0)
  })

  it('adopts a rotated refresh token when the refresher returns one', async () => {
    const d = deps({
      refresherFor: () => async () => ({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        tokenExpiresAt: null,
      }),
    })
    const result = await freshen(conn({ tokenExpiresAt: new Date(NOW).toISOString() }), d)
    expect(result?.refreshToken).toBe('new-refresh')
  })

  it('marks expired and returns null when the refresher throws', async () => {
    const d = deps({
      refresherFor: () => async () => {
        throw new Error('invalid_grant')
      },
    })
    const result = await freshen(conn({ tokenExpiresAt: new Date(NOW).toISOString() }), d)
    expect(result).toBeNull()
    expect(d.expired).toHaveLength(1)
    expect(d.persisted).toHaveLength(0)
  })

  it('propagates a persist failure (never sync with a token we failed to store)', async () => {
    const d = deps({
      refresherFor: () => async () => ({ accessToken: 'new-access', tokenExpiresAt: null }),
      persist: async () => {
        throw new Error('db down')
      },
    })
    await expect(
      freshen(conn({ tokenExpiresAt: new Date(NOW).toISOString() }), d)
    ).rejects.toThrow('db down')
    expect(d.expired).toHaveLength(0)
  })
})
