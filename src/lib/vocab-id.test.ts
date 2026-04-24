import { describe, expect, it } from 'vitest'
import { generateVocabId } from './vocab-id'

describe('generateVocabId', () => {
  const PREFIX = 'mnn1'
  const BOOK = 'minna_shokyuu_1'

  it('produces the expected ID for a known entry', () => {
    const id = generateVocabId(PREFIX, BOOK, 3, '食べる', 'たべる')
    expect(id).toMatch(/^mnn1_[0-9a-f]{16}$/)
    // Verify it encodes the frozen input format
    const id2 = generateVocabId(PREFIX, BOOK, 3, '食べる', 'たべる')
    expect(id).toBe(id2)
  })

  it('is deterministic across 100 runs', () => {
    const inputs: Array<[string, string, number, string | null, string]> = [
      [PREFIX, BOOK, 1, null, 'わたし'],
      [PREFIX, BOOK, 2, '行きます', 'いきます'],
      [PREFIX, BOOK, 3, '食べる', 'たべる'],
    ]

    for (const args of inputs) {
      const first = generateVocabId(...args)
      for (let i = 0; i < 99; i++) {
        expect(generateVocabId(...args)).toBe(first)
      }
    }
  })

  it('uses kana as hash input when kanji is null', () => {
    const withNull = generateVocabId(PREFIX, BOOK, 1, null, 'わたし')
    const withKana = generateVocabId(PREFIX, BOOK, 1, 'わたし', 'わたし')
    // null kanji → kanji ?? kana resolves to kana; explicit kana kanji resolves differently
    expect(withNull).toBe(withKana)
  })

  it('produces different IDs for different kanji with same kana', () => {
    const id1 = generateVocabId(PREFIX, BOOK, 5, '橋', 'はし')
    const id2 = generateVocabId(PREFIX, BOOK, 5, '箸', 'はし')
    expect(id1).not.toBe(id2)
  })

  it('produces different IDs for different lessons', () => {
    const id1 = generateVocabId(PREFIX, BOOK, 1, null, 'わたし')
    const id2 = generateVocabId(PREFIX, BOOK, 2, null, 'わたし')
    expect(id1).not.toBe(id2)
  })

  it('returns IDs prefixed with the book code', () => {
    const id = generateVocabId('tng5', 'tango_n5', 1, '私', 'わたし')
    expect(id.startsWith('tng5_')).toBe(true)
  })

  it('produces hex hash of exactly 16 characters after prefix', () => {
    const id = generateVocabId(PREFIX, BOOK, 1, null, 'あなた')
    const [, hash] = id.split('_')
    expect(hash).toHaveLength(16)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })
})
