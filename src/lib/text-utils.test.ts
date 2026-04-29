import { describe, expect, it } from 'vitest'
import { normalizeViMeaning } from './text-utils'

describe('normalizeViMeaning', () => {
  it('strips ASCII parenthetical annotation', () => {
    expect(normalizeViMeaning('ngay bây giờ (ima)')).toBe('ngay bây giờ')
  })

  it('strips English gloss in parens', () => {
    expect(normalizeViMeaning('Mỹ (U.S.A.)')).toBe('mỹ')
  })

  it('strips usage note in parens', () => {
    expect(normalizeViMeaning('Giáo viên (không sử dụng khi nói về công việc riêng của mình)'))
      .toBe('giáo viên')
  })

  it('strips full-width parentheses （…）', () => {
    expect(normalizeViMeaning('テスト（test）')).toBe('テスト')
  })

  it('preserves square bracket placeholders', () => {
    expect(normalizeViMeaning('Ông/bà [tên]')).toBe('ông/bà [tên]')
  })

  it('preserves square brackets with Vietnamese text', () => {
    expect(normalizeViMeaning('chụp [ảnh]')).toBe('chụp [ảnh]')
  })

  it('preserves square brackets with romaji', () => {
    expect(normalizeViMeaning('[dōmo] cám ơn rất nhiều')).toBe('[dōmo] cám ơn rất nhiều')
  })

  it('lowercases the result', () => {
    expect(normalizeViMeaning('Giáo Viên')).toBe('giáo viên')
  })

  it('preserves Vietnamese diacritics — does not strip them', () => {
    expect(normalizeViMeaning('Ăn')).toBe('ăn')
    expect(normalizeViMeaning('Ăn')).not.toBe('an')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeViMeaning('  ăn  ')).toBe('ăn')
  })

  it('collapses internal whitespace left by paren removal', () => {
    expect(normalizeViMeaning('ngay bây giờ  (ima)')).toBe('ngay bây giờ')
  })

  it('preserves spaces in multi-word meanings', () => {
    expect(normalizeViMeaning('ngay bây giờ')).toBe('ngay bây giờ')
  })

  it('handles empty string', () => {
    expect(normalizeViMeaning('')).toBe('')
  })

  it('strips multiple separate paren groups', () => {
    expect(normalizeViMeaning('Anh (U.K.) (Britain)')).toBe('anh')
  })

  it('handles meaning that is only parenthetical content', () => {
    expect(normalizeViMeaning('(dùng để biểu thị sự do dự)')).toBe('')
  })

  it('real: Người nước [quốc tịch] (ví dụ: người Mỹ)', () => {
    expect(normalizeViMeaning('Người nước [quốc tịch] (ví dụ: người Mỹ)'))
      .toBe('người nước [quốc tịch]')
  })

  it('real: anh (tiền thân của) [kun]', () => {
    expect(normalizeViMeaning('anh (tiền thân của) [kun]'))
      .toBe('anh [kun]')
  })

  it('real: Lạnh (cold)', () => {
    expect(normalizeViMeaning('Lạnh (cold)')).toBe('lạnh')
  })

  it('real: giờ - (ji)', () => {
    expect(normalizeViMeaning('giờ - (ji)')).toBe('giờ -')
  })
})
