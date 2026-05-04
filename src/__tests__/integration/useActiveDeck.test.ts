import { beforeEach, describe, expect, it } from 'vitest'
import {
  addKanjiToDeck,
  addVocabToDeck,
  clearKanjiDeck,
  clearVocabDeck,
  exportActiveDeck,
  getActiveDeckKanji,
  getActiveDeckVocab,
  getActiveDeckVocabSRSMap,
  importActiveDeck,
  removeKanjiFromDeck,
  removeVocabFromDeck,
  upsertActiveVocabSRS,
} from '../../db/active-deck'

import { db } from '../../db/schema'
import 'fake-indexeddb/auto'

const USER = 'test-user'
const VOCAB_ID = 'mnn1_abc123'
const CHAR = '食'

beforeEach(async () => {
  await db.active_vocab_items.clear()
  await db.active_kanji_items.clear()
  await db.active_vocab_srs.clear()
  await db.active_kanji_srs.clear()
})

describe('vocab deck', () => {
  it('adds vocab and creates SRS entry', async () => {
    await addVocabToDeck(USER, VOCAB_ID)
    const items = await getActiveDeckVocab(USER)
    expect(items).toHaveLength(1)
    expect(items[0].vocab_id).toBe(VOCAB_ID)
    const srsMap = await getActiveDeckVocabSRSMap(USER)
    expect(srsMap.has(VOCAB_ID)).toBe(true)
    expect(srsMap.get(VOCAB_ID)?.interval_days).toBe(1)
    expect(srsMap.get(VOCAB_ID)?.ease_factor).toBe(2.5)
  })

  it('does not reset SRS if vocab re-added after removal', async () => {
    await addVocabToDeck(USER, VOCAB_ID)
    await upsertActiveVocabSRS({
      userId: USER,
      vocabId: VOCAB_ID,
      interval_days: 10,
      ease_factor: 2.8,
      due_date: '2026-06-01',
      review_count: 5,
      last_rating: 2,
      updated_at: new Date().toISOString(),
    })
    await removeVocabFromDeck(USER, VOCAB_ID)
    await addVocabToDeck(USER, VOCAB_ID)
    const srsMap = await getActiveDeckVocabSRSMap(USER)
    expect(srsMap.get(VOCAB_ID)?.interval_days).toBe(10)
  })

  it('removes vocab but keeps SRS', async () => {
    await addVocabToDeck(USER, VOCAB_ID)
    await removeVocabFromDeck(USER, VOCAB_ID)
    const items = await getActiveDeckVocab(USER)
    expect(items).toHaveLength(0)
    const srsMap = await getActiveDeckVocabSRSMap(USER)
    expect(srsMap.has(VOCAB_ID)).toBe(true)
  })

  it('clearVocabDeck removes items but keeps SRS', async () => {
    await addVocabToDeck(USER, VOCAB_ID)
    await clearVocabDeck(USER)
    const items = await getActiveDeckVocab(USER)
    expect(items).toHaveLength(0)
    const srsMap = await getActiveDeckVocabSRSMap(USER)
    expect(srsMap.has(VOCAB_ID)).toBe(true)
  })
})

describe('kanji deck', () => {
  it('adds kanji and creates SRS entry', async () => {
    await addKanjiToDeck(USER, CHAR)
    const items = await getActiveDeckKanji(USER)
    expect(items).toHaveLength(1)
    expect(items[0].char).toBe(CHAR)
  })

  it('removes kanji', async () => {
    await addKanjiToDeck(USER, CHAR)
    await removeKanjiFromDeck(USER, CHAR)
    const items = await getActiveDeckKanji(USER)
    expect(items).toHaveLength(0)
  })

  it('clearKanjiDeck removes items', async () => {
    await addKanjiToDeck(USER, CHAR)
    await clearKanjiDeck(USER)
    expect(await getActiveDeckKanji(USER)).toHaveLength(0)
  })
})

describe('export/import', () => {
  it('exports deck as JSON', async () => {
    await addVocabToDeck(USER, VOCAB_ID)
    await addKanjiToDeck(USER, CHAR)
    const json = await exportActiveDeck(USER)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.vocab).toContain(VOCAB_ID)
    expect(parsed.kanji).toContain(CHAR)
  })

  it('import skips unknown vocab ids', async () => {
    // Seed vocabulary table with one known item (minimal shape, cast through unknown)
    await db.vocabulary.put({
      vocab_id: VOCAB_ID,
      word: '食べる',
      reading: 'たべる',
      romaji: 'taberu',
      meaning_vi: 'ăn',
      meaning_en: 'to eat',
      book_source: 'minna_shokyuu_1',
      lesson_number: 1,
      pos: ['動詞'],
      pitch_pattern: null,
      pitch_type: null,
      audio_filename: null,
      jlpt_level: null,
      examples: [],
      tags: [],
      deprecated: false,
    } as unknown as Parameters<typeof db.vocabulary.put>[0])
    const json = JSON.stringify({
      version: 1,
      exported_at: new Date().toISOString(),
      vocab: [VOCAB_ID, 'unknown_id'],
      kanji: [],
    })
    const result = await importActiveDeck(USER, json)
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
    const items = await getActiveDeckVocab(USER)
    expect(items).toHaveLength(1)
  })
})
