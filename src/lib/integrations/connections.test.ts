import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistRefreshedTokens } from './connections'
import { decryptToken } from './token-crypto'

// Real crypto, fake DB: the test key exercises the actual AES-GCM path so the
// AAD row-binding invariant is verified, not simulated.
vi.stubEnv('TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'))

type Captured = { table: string; payload: Record<string, unknown>; eqs: [string, unknown][] }

function fakeSupabase(result: { error: unknown } = { error: null }) {
  const captured: Captured = { table: '', payload: {}, eqs: [] }
  const chain = {
    update(payload: Record<string, unknown>) {
      captured.payload = payload
      return chain
    },
    eq(col: string, val: unknown) {
      captured.eqs.push([col, val])
      return chain
    },
    then(resolve: (v: unknown) => void) {
      resolve(result)
    },
  }
  return {
    // Only the update chain is faked; see sync-core.test.ts for the same pattern.
    client: {
      from(table: string) {
        captured.table = table
        return chain
      },
    } as never,
    captured,
  }
}

const row = {
  id: 'conn-1',
  user_id: 'row-owner',
  platform: 'google_ads',
  external_account_id: 'acct-9',
}

beforeEach(() => vi.stubEnv('TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64')))

describe('persistRefreshedTokens', () => {
  it('encrypts with the AAD of the row owner, not the caller', async () => {
    const db = fakeSupabase()
    await persistRefreshedTokens(db.client, 'org-1', row, {
      accessToken: 'fresh-token',
      tokenExpiresAt: '2026-07-23T13:00:00Z',
    })

    const p = db.captured.payload
    const field = {
      ciphertext: p.access_token_ciphertext as string,
      iv: p.access_token_iv as string,
      authTag: p.access_token_auth_tag as string,
    }
    const rowAad = 'row-owner:google_ads:acct-9'
    expect(decryptToken(field, p.token_key_id as string, rowAad)).toBe('fresh-token')
    // Any other identity must fail GCM verification — the ciphertext is row-bound.
    expect(() => decryptToken(field, p.token_key_id as string, 'caller:google_ads:acct-9')).toThrow()
  })

  it('updates the existing row scoped by id and org', async () => {
    const db = fakeSupabase()
    await persistRefreshedTokens(db.client, 'org-1', row, {
      accessToken: 'fresh-token',
      tokenExpiresAt: null,
    })
    expect(db.captured.table).toBe('platform_connections')
    expect(db.captured.eqs).toEqual([
      ['id', 'conn-1'],
      ['org_id', 'org-1'],
    ])
    expect(db.captured.payload.status).toBe('connected')
    expect(db.captured.payload.token_expires_at).toBeNull()
  })

  it('leaves stored refresh-token columns untouched when no new one is returned', async () => {
    const db = fakeSupabase()
    await persistRefreshedTokens(db.client, 'org-1', row, {
      accessToken: 'fresh-token',
      tokenExpiresAt: null,
    })
    expect('refresh_token_ciphertext' in db.captured.payload).toBe(false)
    expect('refresh_token_iv' in db.captured.payload).toBe(false)
    expect('refresh_token_auth_tag' in db.captured.payload).toBe(false)
  })

  it('writes a rotated refresh token when provided', async () => {
    const db = fakeSupabase()
    await persistRefreshedTokens(db.client, 'org-1', row, {
      accessToken: 'fresh-token',
      refreshToken: 'rotated-refresh',
      tokenExpiresAt: null,
    })
    const p = db.captured.payload
    const field = {
      ciphertext: p.refresh_token_ciphertext as string,
      iv: p.refresh_token_iv as string,
      authTag: p.refresh_token_auth_tag as string,
    }
    expect(decryptToken(field, p.token_key_id as string, 'row-owner:google_ads:acct-9')).toBe(
      'rotated-refresh'
    )
  })

  it('throws when the update fails', async () => {
    const db = fakeSupabase({ error: { message: 'db down' } })
    await expect(
      persistRefreshedTokens(db.client, 'org-1', row, {
        accessToken: 'fresh-token',
        tokenExpiresAt: null,
      })
    ).rejects.toThrow('Failed to persist refreshed tokens')
  })
})
