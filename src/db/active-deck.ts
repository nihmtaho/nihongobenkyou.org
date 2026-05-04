import type {
  ActiveDeckExport,
  ActiveKanjiItem,
  ActiveKanjiSRS,
  ActiveVocabItem,
  ActiveVocabSRS,
} from '../types/active-deck'

import { db } from './schema'

const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString()

const DEFAULT_SRS = { interval_days: 1, ease_factor: 2.5, review_count: 0, last_rating: null as null }

// ── Vocab deck ──────────────────────────────────────────────────────────────

export async function addVocabToDeck(userId: string, vocabId: string): Promise<void> {
  await db.transaction('rw', ['active_vocab_items', 'active_vocab_srs'], async () => {
    await db.active_vocab_items.put({ vocab_id: vocabId, user_id: userId, added_at: now() })
    const existing = await db.active_vocab_srs.get([userId, vocabId])
    if (!existing) {
      await db.active_vocab_srs.put({
        userId,
        vocabId,
        ...DEFAULT_SRS,
        due_date: today(),
        updated_at: now(),
      })
    }
  })
}

export async function removeVocabFromDeck(_userId: string, vocabId: string): Promise<void> {
  await db.active_vocab_items.delete(vocabId)
  // SRS state intentionally kept — preserved if vocab is re-added later
}

export async function getActiveDeckVocab(userId: string): Promise<ActiveVocabItem[]> {
  return db.active_vocab_items.where('user_id').equals(userId).sortBy('added_at')
}

export async function clearVocabDeck(userId: string): Promise<void> {
  await db.active_vocab_items.where('user_id').equals(userId).delete()
  // SRS state intentionally kept
}

export async function getActiveDeckVocabSRSMap(userId: string): Promise<Map<string, ActiveVocabSRS>> {
  const rows = await db.active_vocab_srs.where('userId').equals(userId).toArray()
  return new Map(rows.map(r => [r.vocabId, r]))
}

export async function upsertActiveVocabSRS(srs: ActiveVocabSRS): Promise<void> {
  await db.active_vocab_srs.put(srs)
}

export async function getDueActiveVocabSRS(userId: string): Promise<ActiveVocabSRS[]> {
  const t = today()
  return db.active_vocab_srs
    .where('due_date')
    .belowOrEqual(t)
    .filter(c => c.userId === userId)
    .toArray()
}

// ── Kanji deck ──────────────────────────────────────────────────────────────

export async function addKanjiToDeck(userId: string, char: string): Promise<void> {
  await db.transaction('rw', ['active_kanji_items', 'active_kanji_srs'], async () => {
    await db.active_kanji_items.put({ char, user_id: userId, added_at: now() })
    const existing = await db.active_kanji_srs.get([userId, char])
    if (!existing) {
      await db.active_kanji_srs.put({
        userId,
        char,
        ...DEFAULT_SRS,
        due_date: today(),
        updated_at: now(),
      })
    }
  })
}

export async function removeKanjiFromDeck(_userId: string, char: string): Promise<void> {
  await db.active_kanji_items.delete(char)
  // SRS state intentionally kept
}

export async function getActiveDeckKanji(userId: string): Promise<ActiveKanjiItem[]> {
  return db.active_kanji_items.where('user_id').equals(userId).sortBy('added_at')
}

export async function clearKanjiDeck(userId: string): Promise<void> {
  await db.active_kanji_items.where('user_id').equals(userId).delete()
  // SRS state intentionally kept
}

export async function getActiveDeckKanjiSRSMap(userId: string): Promise<Map<string, ActiveKanjiSRS>> {
  const rows = await db.active_kanji_srs.where('userId').equals(userId).toArray()
  return new Map(rows.map(r => [r.char, r]))
}

export async function upsertActiveKanjiSRS(srs: ActiveKanjiSRS): Promise<void> {
  await db.active_kanji_srs.put(srs)
}

export async function getDueActiveKanjiSRS(userId: string): Promise<ActiveKanjiSRS[]> {
  const t = today()
  return db.active_kanji_srs
    .where('due_date')
    .belowOrEqual(t)
    .filter(c => c.userId === userId)
    .toArray()
}

// ── Export / Import ──────────────────────────────────────────────────────────

export async function exportActiveDeck(userId: string): Promise<string> {
  const [vocabItems, kanjiItems] = await Promise.all([
    getActiveDeckVocab(userId),
    getActiveDeckKanji(userId),
  ])
  const payload: ActiveDeckExport = {
    version: 1,
    exported_at: now(),
    vocab: vocabItems.map(v => v.vocab_id),
    kanji: kanjiItems.map(k => k.char),
  }
  return JSON.stringify(payload, null, 2)
}

export async function importActiveDeck(
  userId: string,
  json: string,
): Promise<{ imported: number, skipped: number }> {
  const data: ActiveDeckExport = JSON.parse(json)
  if (data.version !== 1)
    throw new Error(`Unsupported version: ${data.version}`)

  let imported = 0
  let skipped = 0

  for (const vocabId of (data.vocab ?? [])) {
    const exists = await db.vocabulary.get(vocabId)
    if (!exists) {
      skipped++
      continue
    }
    await addVocabToDeck(userId, vocabId)
    imported++
  }

  for (const char of (data.kanji ?? [])) {
    const exists = await db.kanji.get(char)
    if (!exists) {
      skipped++
      continue
    }
    await addKanjiToDeck(userId, char)
    imported++
  }

  return { imported, skipped }
}
