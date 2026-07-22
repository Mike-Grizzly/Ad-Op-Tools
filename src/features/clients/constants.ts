// Entry lookback for the /clients page fetch: longest possible billing cycle (31 days)
// plus margin, and covers the 14-day trend window. Per-client billing windows are
// filtered client-side from this superset.
export const CLIENT_ENTRIES_LOOKBACK_DAYS = 45

export const CLIENT_SORTS = ['at-risk', 'alphabetical', 'highest-spend'] as const
export type ClientSort = (typeof CLIENT_SORTS)[number]
