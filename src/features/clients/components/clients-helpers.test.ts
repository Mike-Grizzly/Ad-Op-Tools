import { describe, it, expect } from 'vitest'
import { parseAmount } from './clients-helpers'

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
