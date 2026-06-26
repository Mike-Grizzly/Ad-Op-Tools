// Meta Graph API version. Bump deliberately — Meta deprecates roughly quarterly with a
// trailing support window; verify against the changelog when wiring live credentials.
export const META_API_VERSION = 'v21.0'

// Per-edge page-size maxima: /campaigns allows up to 1000, /insights up to 500.
export const CAMPAIGNS_PAGE_LIMIT = 200
export const INSIGHTS_PAGE_LIMIT = 500

export const MAX_RETRIES = 4
