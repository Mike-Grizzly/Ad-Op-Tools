import { getOrgContext, type OrgContext } from '@/features/org/queries'
import type { Database } from '@/types/database'
import type { AdPlatform, PlatformConnectionStatus } from '@/types/integrations'
import { encryptToken, decryptToken, currentKeyId } from './token-crypto'
import { freshen, getRefresher, type RefreshedTokens } from './refresh'

// Server-only token store for ad-platform OAuth connections. This is the ONLY place token
// columns are read and decrypted. Client-facing reads (the dashboard) use the token-free
// shape in the budget feature's queries.ts — never this. Every helper re-verifies auth and
// scopes by org_id (defense-in-depth on top of RLS) because tokens can spend real money.

export type ConnectionWithTokens = {
  id: string
  platform: string
  externalAccountId: string
  accountName: string | null
  scopes: string[]
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: string | null
  status: string
}

export type SaveConnectionInput = {
  platform: AdPlatform
  externalAccountId: string
  accountName?: string | null
  scopes: string[]
  accessToken: string
  refreshToken?: string | null
  tokenExpiresAt?: string | null
}

// Binds a token's ciphertext to its row identity: a ciphertext encrypted for one
// (user, platform, account) won't decrypt under another — GCM AAD verification fails.
// The AAD is keyed on the CONNECTING user's id (the row's user_id), not the org: existing
// ciphertexts are bound to it, so decrypt must always derive the AAD from the stored row.
function tokenAad(userId: string, platform: string, externalAccountId: string): string {
  return `${userId}:${platform}:${externalAccountId}`
}

type ConnectionRow = Database['public']['Tables']['platform_connections']['Row']

async function fetchConnectionRow(
  supabase: OrgContext['supabase'],
  orgId: string,
  platform: AdPlatform,
  externalAccountId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('platform', platform)
    .eq('external_account_id', externalAccountId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch connection: ${error.message}`)
  return data
}

function decryptConnectionRow(data: ConnectionRow): ConnectionWithTokens {
  const aad = tokenAad(data.user_id, data.platform, data.external_account_id)
  const hasRefresh =
    data.refresh_token_ciphertext !== null &&
    data.refresh_token_iv !== null &&
    data.refresh_token_auth_tag !== null

  let accessToken: string
  let refreshToken: string | null
  try {
    accessToken = decryptToken(
      {
        ciphertext: data.access_token_ciphertext,
        iv: data.access_token_iv,
        authTag: data.access_token_auth_tag,
      },
      data.token_key_id,
      aad
    )
    refreshToken = hasRefresh
      ? decryptToken(
          {
            ciphertext: data.refresh_token_ciphertext as string,
            iv: data.refresh_token_iv as string,
            authTag: data.refresh_token_auth_tag as string,
          },
          data.token_key_id,
          aad
        )
      : null
  } catch {
    // Don't surface Node's raw crypto error string to logs/responses.
    throw new Error('Token decryption failed (possible tampering or key mismatch)')
  }

  return {
    id: data.id,
    platform: data.platform,
    externalAccountId: data.external_account_id,
    accountName: data.account_name,
    scopes: data.scopes,
    accessToken,
    refreshToken,
    tokenExpiresAt: data.token_expires_at,
    status: data.status,
  }
}

export async function getConnectionWithTokens(
  platform: AdPlatform,
  externalAccountId: string
): Promise<ConnectionWithTokens | null> {
  const ctx = await getOrgContext()
  if (!ctx) return null
  const { supabase, orgId } = ctx

  const data = await fetchConnectionRow(supabase, orgId, platform, externalAccountId)
  if (!data) return null
  return decryptConnectionRow(data)
}

// Like getConnectionWithTokens, but refreshes a near-expiry token first (blueprint
// §3.4) and marks the connection 'expired' when it can't be made usable — the
// sync path then reports it as a failure and the UI shows "reconnect". Platforms
// without a refresher (Meta) simply expire. Sync callers should inject THIS one.
export async function getFreshConnectionWithTokens(
  platform: AdPlatform,
  externalAccountId: string
): Promise<ConnectionWithTokens | null> {
  const ctx = await getOrgContext()
  if (!ctx) return null
  const { supabase, orgId } = ctx

  const data = await fetchConnectionRow(supabase, orgId, platform, externalAccountId)
  if (!data) return null
  const conn = decryptConnectionRow(data)

  return freshen(conn, {
    refresherFor: getRefresher,
    persist: (tokens) => persistRefreshedTokens(supabase, orgId, data, tokens),
    markExpired: () => updateConnectionStatus(supabase, orgId, data.id, 'expired'),
    now: Date.now,
  })
}

// Persists refreshed tokens onto the EXISTING row by id. Deliberately not
// saveConnection: its upsert key is (user_id, platform, external_account_id), so a
// caller other than the connecting user would insert a new row instead of updating
// this one. The AAD must come from the row's stored user_id — the crypto invariant
// from the org slice — never from whoever triggered the refresh. `row` must be the
// row as fetched from the DB, never a constructed literal: a wrong user_id here
// writes ciphertext the real owner can't decrypt (fails closed, but bricks the row).
export async function persistRefreshedTokens(
  supabase: OrgContext['supabase'],
  orgId: string,
  row: Pick<ConnectionRow, 'id' | 'user_id' | 'platform' | 'external_account_id'>,
  tokens: RefreshedTokens
): Promise<void> {
  const aad = tokenAad(row.user_id, row.platform, row.external_account_id)
  const access = encryptToken(tokens.accessToken, aad)
  // undefined/null = platform sent no new refresh token; keep the stored columns
  // untouched (Google often omits it on refresh — overwriting would orphan us).
  const refresh = tokens.refreshToken ? encryptToken(tokens.refreshToken, aad) : null

  const { error } = await supabase
    .from('platform_connections')
    .update({
      token_key_id: currentKeyId,
      access_token_ciphertext: access.ciphertext,
      access_token_iv: access.iv,
      access_token_auth_tag: access.authTag,
      ...(refresh
        ? {
            refresh_token_ciphertext: refresh.ciphertext,
            refresh_token_iv: refresh.iv,
            refresh_token_auth_tag: refresh.authTag,
          }
        : {}),
      token_expires_at: tokens.tokenExpiresAt,
      status: 'connected',
    })
    .eq('id', row.id)
    .eq('org_id', orgId)

  if (error) throw new Error(`Failed to persist refreshed tokens: ${error.message}`)
}

export async function saveConnection(
  input: SaveConnectionInput
): Promise<{ id: string } | null> {
  const ctx = await getOrgContext()
  if (!ctx) return null
  const { supabase, userId, orgId } = ctx

  const aad = tokenAad(userId, input.platform, input.externalAccountId)
  const access = encryptToken(input.accessToken, aad)
  const refresh = input.refreshToken ? encryptToken(input.refreshToken, aad) : null

  const { data, error } = await supabase
    .from('platform_connections')
    .upsert(
      {
        user_id: userId,
        org_id: orgId,
        platform: input.platform,
        external_account_id: input.externalAccountId,
        account_name: input.accountName ?? null,
        scopes: input.scopes,
        token_key_id: currentKeyId,
        access_token_ciphertext: access.ciphertext,
        access_token_iv: access.iv,
        access_token_auth_tag: access.authTag,
        refresh_token_ciphertext: refresh?.ciphertext ?? null,
        refresh_token_iv: refresh?.iv ?? null,
        refresh_token_auth_tag: refresh?.authTag ?? null,
        token_expires_at: input.tokenExpiresAt ?? null,
        status: 'connected',
      },
      { onConflict: 'user_id,platform,external_account_id' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save connection: ${error.message}`)
  if (!data) return null
  return { id: data.id }
}

// Save several connections in one atomic upsert (e.g. all ad accounts from one OAuth grant),
// so a mid-loop failure can't leave a partially-connected state. Each row is encrypted with
// its own IV and AAD.
export async function saveConnections(inputs: SaveConnectionInput[]): Promise<number> {
  if (inputs.length === 0) return 0

  const ctx = await getOrgContext()
  if (!ctx) return 0
  const { supabase, userId, orgId } = ctx

  const rows = inputs.map((input) => {
    const aad = tokenAad(userId, input.platform, input.externalAccountId)
    const access = encryptToken(input.accessToken, aad)
    const refresh = input.refreshToken ? encryptToken(input.refreshToken, aad) : null
    return {
      user_id: userId,
      org_id: orgId,
      platform: input.platform,
      external_account_id: input.externalAccountId,
      account_name: input.accountName ?? null,
      scopes: input.scopes,
      token_key_id: currentKeyId,
      access_token_ciphertext: access.ciphertext,
      access_token_iv: access.iv,
      access_token_auth_tag: access.authTag,
      refresh_token_ciphertext: refresh?.ciphertext ?? null,
      refresh_token_iv: refresh?.iv ?? null,
      refresh_token_auth_tag: refresh?.authTag ?? null,
      token_expires_at: input.tokenExpiresAt ?? null,
      status: 'connected',
    }
  })

  const { error } = await supabase
    .from('platform_connections')
    .upsert(rows, { onConflict: 'user_id,platform,external_account_id' })

  if (error) throw new Error(`Failed to save connections: ${error.message}`)
  return rows.length
}

async function updateConnectionStatus(
  supabase: OrgContext['supabase'],
  orgId: string,
  id: string,
  status: PlatformConnectionStatus
): Promise<void> {
  const { error } = await supabase
    .from('platform_connections')
    .update({ status })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) throw new Error(`Failed to update connection status: ${error.message}`)
}

export async function markConnectionStatus(
  id: string,
  status: PlatformConnectionStatus
): Promise<void> {
  const ctx = await getOrgContext()
  if (!ctx) return
  await updateConnectionStatus(ctx.supabase, ctx.orgId, id, status)
}
