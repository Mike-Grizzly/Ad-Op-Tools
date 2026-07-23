// Platform-agnostic error contract for ad-platform integrations. Each platform's
// typed API error (MetaApiError today, Google's later) extends PlatformApiError, so
// shared code (sync-core) classifies failures with one `instanceof` check and never
// imports platform modules.

export abstract class PlatformApiError extends Error {
  // OAuth token expired/invalid/revoked — caller marks the connection expired.
  abstract get isAuthError(): boolean
  abstract get isRateLimited(): boolean
  abstract get isTransient(): boolean
}

// Thrown by the factory for platforms with no client implementation yet. The support
// check must run BEFORE any connection lookup so callers surface "unsupported", not
// "no connection found" (see assertPlatformReady in factory.ts).
export class UnsupportedPlatformError extends Error {
  readonly platform: string

  constructor(platform: string) {
    super(`Unsupported platform: ${platform}`)
    this.name = 'UnsupportedPlatformError'
    this.platform = platform
  }
}

// Supported platform whose app-level credentials (env vars) are missing.
export class PlatformNotConfiguredError extends Error {
  readonly platform: string

  constructor(platform: string) {
    super(`${platform} is not configured`)
    this.name = 'PlatformNotConfiguredError'
    this.platform = platform
  }
}
