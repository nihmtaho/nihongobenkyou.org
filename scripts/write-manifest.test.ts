import { describe, expect, it } from 'vitest'
import { bumpPatch } from './write-manifest'

describe('bumpPatch', () => {
  it('increments the patch component', () => {
    expect(bumpPatch('1.0.0')).toBe('1.0.1')
  })

  it('handles double-digit patch', () => {
    expect(bumpPatch('2.3.9')).toBe('2.3.10')
  })

  it('preserves major and minor components', () => {
    expect(bumpPatch('5.12.3')).toBe('5.12.4')
  })

  it('returns 1.0.0 for malformed input', () => {
    expect(bumpPatch('invalid')).toBe('1.0.0')
    expect(bumpPatch('')).toBe('1.0.0')
    expect(bumpPatch('1.0')).toBe('1.0.0')
  })
})
