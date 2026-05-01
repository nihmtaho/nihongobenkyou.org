import type { KanjiItem } from '../types/kanji'
import type { VocabItem } from '../types/vocabulary'
import { describe, expect, it } from 'vitest'
import { selectDistractors, selectKanjiDistractors } from './quiz'

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

function makeKanji(char: string, jlpt: KanjiItem['jlpt_level'], hanViet: string | null = char): KanjiItem {
  return {
    char,
    jlpt_level: jlpt,
    lesson_number: null,
    radical: null,
    stroke_count: 1,
    onyomi: [],
    kunyomi: [],
    meaning_en: [],
    meaning_vi: [],
    han_viet: hanViet,
    mnemonic_vi: null,
    components: null,
    stroke_paths: null,
    examples: null,
    related_vocab: null,
  }
}

const KANJI_N5 = ['食', '水', '火', '木', '金'].map(c => makeKanji(c, 'N5'))
const KANJI_N4 = ['強', '弱', '多', '少'].map(c => makeKanji(c, 'N4'))
const KANJI_POOL = [...KANJI_N5, ...KANJI_N4]
const KANJI_TARGET = KANJI_N5[0]

describe('selectKanjiDistractors', () => {
  it('returns exactly 3 distractors', () => {
    expect(selectKanjiDistractors(KANJI_TARGET, KANJI_POOL)).toHaveLength(3)
  })

  it('never includes the target kanji', () => {
    for (let i = 0; i < 50; i++) {
      const result = selectKanjiDistractors(KANJI_TARGET, KANJI_POOL)
      expect(result.every(k => k.char !== KANJI_TARGET.char)).toBe(true)
    }
  })

  it('prefers same JLPT level', () => {
    for (let i = 0; i < 50; i++) {
      const result = selectKanjiDistractors(KANJI_TARGET, KANJI_POOL)
      const sameLevel = result.filter(k => k.jlpt_level === KANJI_TARGET.jlpt_level)
      expect(sameLevel.length).toBe(3)
    }
  })

  it('falls back to other levels when same-level pool is too small', () => {
    const smallPool = [makeKanji('水', 'N5'), makeKanji('強', 'N4'), makeKanji('弱', 'N4'), makeKanji('多', 'N4')]
    const result = selectKanjiDistractors(KANJI_TARGET, smallPool)
    expect(result).toHaveLength(3)
    expect(result.every(k => k.char !== KANJI_TARGET.char)).toBe(true)
  })

  it('excludes kanji with null han_viet', () => {
    const poolWithNull = [
      makeKanji('水', 'N5', null),
      makeKanji('火', 'N5'),
      makeKanji('木', 'N5'),
      makeKanji('金', 'N5'),
    ]
    const result = selectKanjiDistractors(KANJI_TARGET, poolWithNull)
    expect(result.every(k => k.han_viet !== null)).toBe(true)
  })

  it('returns no duplicates', () => {
    for (let i = 0; i < 50; i++) {
      const result = selectKanjiDistractors(KANJI_TARGET, KANJI_POOL)
      const chars = result.map(k => k.char)
      expect(new Set(chars).size).toBe(chars.length)
    }
  })
})
