import type { AdPlatform } from '@/types/integrations'

// Platforms with a working connect flow today. The rest render as "coming soon".
export const CONNECTABLE_PLATFORMS: readonly AdPlatform[] = ['meta']

// Default look-back window for an initial/manual sync when no range is supplied.
export const DEFAULT_SYNC_DAYS = 30
