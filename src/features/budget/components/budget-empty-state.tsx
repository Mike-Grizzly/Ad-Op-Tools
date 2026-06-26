'use client'

import { AD_PLATFORMS } from '@/types/integrations'
import { CONNECTABLE_PLATFORMS } from '../constants'
import { platformLabel, platformColor, platformGlyph } from './budget-helpers'

type Props = {
  monoFont: string
  connectHref: string
}

const DESCRIPTIONS: Record<string, string> = {
  meta: 'Facebook & Instagram ad spend',
  google_ads: 'Search, Display & YouTube',
  linkedin: 'LinkedIn Campaign Manager',
  tiktok: 'TikTok Ads Manager',
}

export function BudgetEmptyState({ monoFont, connectHref }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9ebef',
        borderRadius: 16,
        padding: '46px 36px 40px',
        boxShadow: '0 1px 2px rgba(22,25,34,.04)',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto 30px', textAlign: 'center' }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            background: 'rgba(79,70,229,.09)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M15 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </svg>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>Connect a platform to see your spend</div>
        <p style={{ fontSize: 14, color: '#6b727f', margin: '8px 0 0', lineHeight: 1.6 }}>
          Pull spend, impressions and campaign data into one place. Connect Meta to begin — the others are on the way.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, maxWidth: 680, margin: '0 auto' }}>
        {AD_PLATFORMS.map((platform) => {
          const connectable = CONNECTABLE_PLATFORMS.includes(platform)
          return (
            <div
              key={platform}
              style={{
                border: '1px solid #e9ebef',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: '#fff',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: platformColor(platform),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#fff',
                  flex: 'none',
                }}
              >
                {platformGlyph(platform)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{platformLabel(platform)}</div>
                <div style={{ fontSize: 12, color: '#9aa0aa', marginTop: 2 }}>{DESCRIPTIONS[platform]}</div>
              </div>
              {connectable ? (
                <a
                  href={connectHref}
                  style={{
                    flex: 'none',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 9,
                    padding: '9px 15px',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Connect
                </a>
              ) : (
                <span
                  style={{
                    flex: 'none',
                    fontFamily: monoFont,
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9aa0aa',
                    background: '#f1f2f4',
                    borderRadius: 7,
                    padding: '6px 10px',
                  }}
                >
                  Coming soon
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
