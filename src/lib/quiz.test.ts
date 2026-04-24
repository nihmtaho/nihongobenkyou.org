import type { VocabItem } from '../types/vocabulary'
import { describe, expect, it } from 'vitest'
import { selectDistractors } from './quiz'

function makeVocab(id: string, lesson: number, jlpt: number | null = 5): VocabItem {
  return {
    vocab_id: id,
    word: id,
    reading: id,
    romaji: id,
    meaning_en: id,
    meaning_vi: id,
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: null,
    pos: [],
    jlpt_level: jlpt,
    book_source: 'minna_shokyuu_1',
    lesson_number: lesson,
    examples: [],
    tags: [],
    deprecated: false,
  }
}

const L1 = [1, 2, 3, 4, 5].map(i => makeVocab(`l1_${i}`, 1))
const L2 = [1, 2, 3].map(i => makeVocab(`l2_${i}`, 2))
const ALL = [...L1, ...L2]
const CORRECT = L1[0]

describe('selectDistractors', () => {
  it('returns exactly 3 distractors by default', () => {
    expect(selectDistractors(CORRECT, ALL)).toHaveLength(3)
  })

  it('never includes the correct answer', () => {
    for (let i = 0; i < 100; i++) {
      const distractors = selectDistractors(CORRECT, ALL)
      expect(distractors.every(d => d.vocab_id !== CORRECT.vocab_id)).toBe(true)
    }
  })

  it('prefers same-lesson distractors', () => {
    const distractors = selectDistractors(CORRECT, ALL)
    const sameLessonCount = distractors.filter(d => d.lesson_number === CORRECT.lesson_number).length
    expect(sameLessonCount).toBeGreaterThan(0)
  })

  it('falls back to JLPT pool when lesson has < 4 items', () => {
    const smallLesson = [makeVocab('s1', 9, 5), makeVocab('s2', 9, 5)]
    const correct = makeVocab('s0', 9, 5)
    const jlptPool = [1, 2, 3, 4].map(i => makeVocab(`jlpt_${i}`, 10, 5))
    const pool = [...smallLesson, ...jlptPool]
    const distractors = selectDistractors(correct, pool)
    expect(distractors).toHaveLength(3)
    expect(distractors.every(d => d.vocab_id !== correct.vocab_id)).toBe(true)
  })

  it('returns no duplicates in 100 generations', () => {
    for (let i = 0; i < 100; i++) {
      const distractors = selectDistractors(CORRECT, ALL)
      const ids = distractors.map(d => d.vocab_id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
