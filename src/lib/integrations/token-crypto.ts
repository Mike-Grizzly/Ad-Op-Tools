import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// App-side AES-256-GCM for OAuth tokens at rest (see docs/decision-log.md "OAuth Token
// Encryption" + "Token Storage Schema Hardened"). Server-only — never import client-side.
// The key lives in TOKEN_ENCRYPTION_KEY (base64, 32 bytes), never in the DB. Each encrypt
// uses a fresh random 12-byte IV; decrypt verifies the GCM auth tag and THROWS on mismatch
// (the error must propagate — a tampered/corrupt token must never decrypt to garbage).

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16
const KEY_BYTES = 32

// Active key version stamped onto every row we write (token_key_id). Bump when rotating;
// getKey() then maps each version to its key so old rows can still be decrypted.
const CURRENT_KEY_ID = 'v1'

export const currentKeyId = CURRENT_KEY_ID

export type EncryptedField = {
  ciphertext: string // base64
  iv: string // base64 (12 bytes)
  authTag: string // base64 (16 bytes)
}

function getKey(keyId: string): Buffer {
  if (keyId !== CURRENT_KEY_ID) {
    throw new Error(`Unknown token key id: ${keyId}`)
  }
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not set')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`)
  }
  return key
}

export function encryptToken(plaintext: string): EncryptedField {
  const key = getKey(CURRENT_KEY_ID)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptToken(field: EncryptedField, keyId: string): string {
  const key = getKey(keyId)
  const iv = Buffer.from(field.iv, 'base64')
  if (iv.length !== IV_BYTES) {
    throw new Error('Invalid token IV length')
  }
  const authTag = Buffer.from(field.authTag, 'base64')
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error('Invalid token auth tag length')
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  // .final() throws if the auth tag does not verify — do not catch; let it propagate.
  return Buffer.concat([
    decipher.update(Buffer.from(field.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
