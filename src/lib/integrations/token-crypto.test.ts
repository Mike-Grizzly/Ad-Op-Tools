import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  currentKeyId,
  decryptToken,
  encryptToken,
  type EncryptedField,
} from "./token-crypto";

const AAD = "user-123:meta:act_456";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

afterAll(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY;
});

describe("token-crypto round-trip", () => {
  it("decrypts what it encrypted under the same AAD", () => {
    const plaintext = "EAAB-super-secret-oauth-token";
    const field = encryptToken(plaintext, AAD);
    expect(decryptToken(field, currentKeyId, AAD)).toBe(plaintext);
  });

  it("produces a fresh IV per encryption", () => {
    const a = encryptToken("same-input", AAD);
    const b = encryptToken("same-input", AAD);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});

describe("token-crypto tamper resistance", () => {
  const plaintext = "EAAB-super-secret-oauth-token";

  it("throws when the ciphertext is tampered with", () => {
    const field = encryptToken(plaintext, AAD);
    const tampered: EncryptedField = {
      ...field,
      ciphertext: Buffer.from("totally-different-bytes").toString("base64"),
    };
    expect(() => decryptToken(tampered, currentKeyId, AAD)).toThrow();
  });

  it("throws when decrypted under a different AAD (row-binding)", () => {
    const field = encryptToken(plaintext, AAD);
    expect(() =>
      decryptToken(field, currentKeyId, "user-999:meta:act_456"),
    ).toThrow();
  });

  it("throws on an unknown key id", () => {
    const field = encryptToken(plaintext, AAD);
    expect(() => decryptToken(field, "v-unknown", AAD)).toThrow(
      /Unknown token key id/,
    );
  });

  it("throws when the auth tag is the wrong length", () => {
    const field = encryptToken(plaintext, AAD);
    const bad: EncryptedField = {
      ...field,
      authTag: Buffer.from("short").toString("base64"),
    };
    expect(() => decryptToken(bad, currentKeyId, AAD)).toThrow(
      /auth tag length/,
    );
  });
});
