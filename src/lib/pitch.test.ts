import { describe, expect, it } from 'vitest'

import { parsePitchPattern } from './pitch'

describe('parsePitchPattern', () => {
  it('null → null', () => {
    expect(parsePitchPattern(null, 3)).toBeNull()
  })

  it('0 + 3 morae → [L, H, H] (heiban)', () => {
    expect(parsePitchPattern(0, 3)).toEqual(['L', 'H', 'H'])
  })

  it('1 + 4 morae → [H, L, L, L] (atamadaka)', () => {
    expect(parsePitchPattern(1, 4)).toEqual(['H', 'L', 'L', 'L'])
  })

  it('2 + 3 morae → [L, H, L] (nakadaka drop at 2)', () => {
    expect(parsePitchPattern(2, 3)).toEqual(['L', 'H', 'L'])
  })

  it('heiban boundary: 0 + 1 mora → [L]', () => {
    expect(parsePitchPattern(0, 1)).toEqual(['L'])
  })

  it('0 + 4 morae → [L, H, H, H]', () => {
    expect(parsePitchPattern(0, 4)).toEqual(['L', 'H', 'H', 'H'])
  })
})
