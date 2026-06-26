import { createClient } from '@/lib/supabase/server'
import type { AdPlatform, PlatformConnectionStatus } from '@/types/integrations'
import { encryptToken, decryptToken, currentKeyId } from './token-crypto'

// Server-only token store for ad-platform OAuth connections. This is the ONLY place token
// columns are read and decrypted. Client-facing reads (the dashboard) use the token-free
// shape in the budget feature's queries.ts — never this. Every helper re-verifies auth and
// scopes by user_id (defense-in-depth on top of RLS) because tokens can spend real money.

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
function tokenAad(userId: string, platform: string, externalAccountId: string): string {
  return `${userId}:${platform}:${externalAccountId}`
}

export async function getConnectionWithTokens(
  platform: AdPlatform,
  externalAccountId: string
): Promise<ConnectionWithTokens | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .eq('external_account_id', externalAccountId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch connection: ${error.message}`)
  if (!data) return null

  const aad = tokenAad(user.id, data.platform, data.external_account_id)
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

export async function saveConnection(
  input: SaveConnectionInput
): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const aad = tokenAad(user.id, input.platform, input.externalAccountId)
  const access = encryptToken(input.accessToken, aad)
  const refresh = input.refreshToken ? encryptToken(input.refreshToken, aad) : null

  const { data, error } = await supabase
    .from('platform_connections')
    .upsert(
      {
        user_id: user.id,
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

export async function markConnectionStatus(
  id: string,
  status: PlatformConnectionStatus
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('platform_connections')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to update connection status: ${error.message}`)
}
