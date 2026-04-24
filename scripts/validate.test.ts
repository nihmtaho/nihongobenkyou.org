import { describe, expect, it } from 'vitest'
import { validateEntries } from './validate'

const BASE_ENTRY = {
  vocab_id: 'mnn1_abc123def456abcd',
  kanji: null,
  kana: 'わたし',
  romaji: 'watashi',
  meaning: { en: 'I', vi: 'Tôi' },
  pos: ['noun'],
  jlpt: 5,
  examples: [],
  lesson_number: 1,
  pitch_pattern: null,
  audio_filename: null,
}

describe('validateEntries', () => {
  it('returns no errors for a valid entry', () => {
    expect(validateEntries([BASE_ENTRY])).toHaveLength(0)
  })

  it('rejects missing kana', () => {
    const errors = validateEntries([{ ...BASE_ENTRY, kana: '' }])
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('kana')
  })

  it('rejects missing meaning.en', () => {
    const errors = validateEntries([{ ...BASE_ENTRY, meaning: { en: '', vi: 'Tôi' } }])
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('meaning.en')
  })

  it('rejects missing meaning.vi', () => {
    const errors = validateEntries([{ ...BASE_ENTRY, meaning: { en: 'I', vi: '' } }])
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('meaning.vi')
  })

  it('rejects invalid jlpt level (out of range)', () => {
    const errors = validateEntries([{ ...BASE_ENTRY, jlpt: 6 }])
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('jlpt')
  })

  it('accepts null jlpt', () => {
    expect(validateEntries([{ ...BASE_ENTRY, jlpt: null }])).toHaveLength(0)
  })

  it('rejects duplicate vocab_id', () => {
    const entries = [BASE_ENTRY, { ...BASE_ENTRY, kana: 'あなた' }]
    const errors = validateEntries(entries)
    const dupeErrors = errors.filter(e => e.field === 'vocab_id')
    expect(dupeErrors.length).toBeGreaterThan(0)
  })

  it('rejects incomplete example blocks (missing vi)', () => {
    const entry = {
      ...BASE_ENTRY,
      vocab_id: 'mnn1_unique111111111',
      examples: [{ ja: '私は学生です', en: 'I am a student', vi: '' }],
    }
    const errors = validateEntries([entry])
    expect(errors.some(e => e.field.includes('vi'))).toBe(true)
  })

  it('collects ALL errors before returning — does not stop at first', () => {
    const entries = [
      { ...BASE_ENTRY, vocab_id: 'mnn1_aaa', kana: '', meaning: { en: '', vi: '' } },
      { ...BASE_ENTRY, vocab_id: 'mnn1_bbb', meaning: { en: 'X', vi: '' } },
    ]
    const errors = validateEntries(entries)
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })
})
