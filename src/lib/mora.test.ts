import { describe, expect, it } from 'vitest'

import { moraCount } from './mora'

describe('moraCount', () => {
  it('わたし → 3', () => {
    expect(moraCount('わたし')).toBe(3)
  })

  it('きゃく → 2', () => {
    expect(moraCount('きゃく')).toBe(2)
  })

  it('ラーメン → 4', () => {
    expect(moraCount('ラーメン')).toBe(4)
  })

  it('っと → 2', () => {
    expect(moraCount('っと')).toBe(2)
  })

  // びょ is 1 compound mora (び+ょ), then う+い+ん = 4 total
  it('びょういん → 4', () => {
    expect(moraCount('びょういん')).toBe(4)
  })
})
