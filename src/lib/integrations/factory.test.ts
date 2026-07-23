import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertPlatformReady, getClientForConnection } from './factory'
import { PlatformNotConfiguredError, UnsupportedPlatformError } from './errors'
import type { ConnectionWithTokens } from './connections'

function conn(platform: string): ConnectionWithTokens {
  return {
    id: 'conn-1',
    platform,
    externalAccountId: 'act_123',
    accountName: 'Test Account',
    scopes: ['ads_read'],
    accessToken: 'token',
    refreshToken: null,
    tokenExpiresAt: null,
    status: 'connected',
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getClientForConnection', () => {
  it('builds a Meta client when the app secret is configured', () => {
    vi.stubEnv('META_APP_SECRET', 'secret')
    const client = getClientForConnection(conn('meta'))
    expect(client.platform).toBe('meta')
  })

  it('throws PlatformNotConfiguredError when the Meta secret is missing', () => {
    vi.stubEnv('META_APP_SECRET', '')
    expect(() => getClientForConnection(conn('meta'))).toThrow(PlatformNotConfiguredError)
  })

  it('throws UnsupportedPlatformError for platforms without a client, preserving the platform', () => {
    vi.stubEnv('META_APP_SECRET', 'secret')
    try {
      getClientForConnection(conn('google_ads'))
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedPlatformError)
      expect((err as UnsupportedPlatformError).platform).toBe('google_ads')
    }
  })
})

describe('assertPlatformReady', () => {
  it('rejects unsupported platforms even when the Meta secret is unset', () => {
    // The support check must precede the config check — that ordering is behavior.
    vi.stubEnv('META_APP_SECRET', '')
    expect(() => assertPlatformReady('google_ads')).toThrow(UnsupportedPlatformError)
  })

  it('throws PlatformNotConfiguredError for meta without a secret', () => {
    vi.stubEnv('META_APP_SECRET', '')
    expect(() => assertPlatformReady('meta')).toThrow(PlatformNotConfiguredError)
  })

  it('passes for meta when the secret is set', () => {
    vi.stubEnv('META_APP_SECRET', 'secret')
    expect(() => assertPlatformReady('meta')).not.toThrow()
  })
})
