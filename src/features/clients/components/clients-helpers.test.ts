import { describe, it, expect } from 'vitest'
import { parseAmount, pillFor } from './clients-helpers'
import type { ClientPacing } from '../pacing'

function pacingWith(budgetMicros: number | null, status: ClientPacing['status']): ClientPacing {
  return {
    window: { from: '2026-07-01', to: '2026-07-31', dayOfCycle: 22, daysInCycle: 31, daysLeft: 9 },
    budgetMicros,
    spendMicros: 0,
    idealMicros: 0,
    projectedMicros: 0,
    deviation: null,
    pctUsed: null,
    status,
    perPlatform: [],
    trend: null,
  }
}

describe('pillFor', () => {
  it('shows No budget when the client has no budget, regardless of accounts', () => {
    expect(pillFor(pacingWith(null, 'none'), false).label).toBe('No budget')
    expect(pillFor(pacingWith(null, 'none'), true).label).toBe('No budget')
  })

  it('shows No accounts instead of a pacing color when nothing is assigned', () => {
    // Raw pacing says red ($0 spend vs a budget) — presentation neutralizes it.
    expect(pillFor(pacingWith(100_000_000, 'red'), false).label).toBe('No accounts')
  })

  it('passes through real pacing status once accounts are assigned', () => {
    expect(pillFor(pacingWith(100_000_000, 'red'), true).label).toBe('At risk')
    expect(pillFor(pacingWith(100_000_000, 'green'), true).label).toBe('On pace')
    expect(pillFor(pacingWith(100_000_000, 'yellow'), true).label).toBe('Off pace')
  })
})

describe('parseAmount', () => {
  it('parses plain numbers', () => {
    expect(parseAmount('5000')).toBe(5000)
    expect(parseAmount('5000.50')).toBe(5000.5)
    expect(parseAmount('0')).toBe(0)
  })

  it('tolerates commas, dollar signs, and spaces', () => {
    expect(parseAmount('5,000')).toBe(5000)
    expect(parseAmount('$5,000')).toBe(5000)
    expect(parseAmount('$1,234.56')).toBe(1234.56)
    expect(parseAmount(' 5 000 ')).toBe(5000)
  })

  it('treats empty as null (no budget)', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
    expect(parseAmount('$')).toBeNull()
  })

  it('rejects garbage and negatives', () => {
    expect(parseAmount('abc')).toBe('invalid')
    expect(parseAmount('5k')).toBe('invalid')
    expect(parseAmount('-100')).toBe('invalid')
    expect(parseAmount('1.2.3')).toBe('invalid')
  })
})
