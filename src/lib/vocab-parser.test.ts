import { describe, expect, it } from 'vitest'
import { parseJsonVocab, parseCsvVocab } from './vocab-parser'

describe('parseJsonVocab', () => {
  it('parses valid JSON array', () => {
    const input = JSON.stringify([
      { word: '会議', kana: 'かいぎ', han_viet: 'hội nghị', meaning_vi: 'cuộc họp' },
    ])
    const result = parseJsonVocab(input)
    expect(result.errors).toHaveLength(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual({
      word: '会議', kana: 'かいぎ', han_viet: 'hội nghị', meaning_vi: 'cuộc họp',
    })
  })

  it('allows word to be absent (kana-only vocab)', () => {
    const input = JSON.stringify([{ kana: 'てすと', meaning_vi: 'test' }])
    const result = parseJsonVocab(input)
    expect(result.errors).toHaveLength(0)
    expect(result.items[0].word).toBeNull()
  })

  it('returns error for non-array JSON', () => {
    const result = parseJsonVocab('{"kana":"a"}')
    expect(result.items).toHaveLength(0)
    expect(result.errors[0].reason).toMatch(/array/)
  })

  it('skips rows missing kana with error', () => {
    const input = JSON.stringify([{ word: '会', meaning_vi: 'test' }])
    const result = parseJsonVocab(input)
    expect(result.items).toHaveLength(0)
    expect(result.errors[0].reason).toMatch(/kana/)
  })

  it('returns error for invalid JSON', () => {
    const result = parseJsonVocab('not json')
    expect(result.items).toHaveLength(0)
    expect(result.errors[0].reason).toMatch(/JSON/)
  })
})

describe('parseCsvVocab', () => {
  it('parses CSV with all columns', () => {
    const csv = 'word,kana,han_viet,meaning_vi\n会議,かいぎ,hội nghị,cuộc họp'
    const result = parseCsvVocab(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.items[0]).toEqual({
      word: '会議', kana: 'かいぎ', han_viet: 'hội nghị', meaning_vi: 'cuộc họp',
    })
  })

  it('word column is optional', () => {
    const csv = 'kana,meaning_vi\nてすと,test'
    const result = parseCsvVocab(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.items[0].word).toBeNull()
  })

  it('returns error for missing kana column', () => {
    const csv = 'word,meaning_vi\n会,test'
    const result = parseCsvVocab(csv)
    expect(result.items).toHaveLength(0)
    expect(result.errors[0].reason).toMatch(/kana/)
  })

  it('skips rows with empty kana', () => {
    const csv = 'kana,meaning_vi\n,empty kana'
    const result = parseCsvVocab(csv)
    expect(result.items).toHaveLength(0)
    expect(result.errors[0].row).toBe(2)
  })
})
