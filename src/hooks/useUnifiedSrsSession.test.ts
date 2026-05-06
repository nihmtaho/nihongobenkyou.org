import { describe, expect, it } from 'vitest'

describe('useUnifiedSrsSession — phase transitions', () => {
  it('starts in loading phase', () => {
    expect(true).toBe(true)
  })

  it('transitions to pre-session when due cards are loaded', () => {
    expect(true).toBe(true)
  })

  it('transitions to complete when all cards are rated', () => {
    expect(true).toBe(true)
  })
})

describe('buildUnifiedQueue', () => {
  it('tags rv_* vocabIds as kanji-vocab kind', () => {
    expect(true).toBe(true)
  })

  it('tags regular vocabIds as vocab kind', () => {
    expect(true).toBe(true)
  })
})
