import type { KanjiItem } from '../types/kanji'
import type { SRSCard } from '../types/srs'
import type { VocabItem } from '../types/vocabulary'
import { db } from './schema'
import { initSRSCard, upsertSRSCard } from './srs-cards'

interface KanjiFilters {
  jlpt_level?: KanjiItem['jlpt_level']
  lesson_number?: number
  radical?: string
  stroke_count?: number
}

export async function getKanji(char: string): Promise<KanjiItem | undefined> {
  return db.kanji.get(char)
}

export async function getAllKanji(filters?: KanjiFilters): Promise<KanjiItem[]> {
  let collection = db.kanji.toCollection()

  if (filters?.lesson_number !== undefined) {
    collection = db.kanji.where('lesson_number').equals(filters.lesson_number)
  }
  else if (filters?.jlpt_level) {
    collection = db.kanji.where('jlpt_level').equals(filters.jlpt_level)
  }

  const results = await collection.toArray()

  return results.filter((k) => {
    if (filters?.radical && k.radical !== filters.radical)
      return false
    if (filters?.stroke_count !== undefined && k.stroke_count !== filters.stroke_count)
      return false
    return true
  })
}

export async function getKanjiLessons(): Promise<number[]> {
  const all = await db.kanji.toArray()
  const nums = [...new Set(all.map(k => k.lesson_number).filter((n): n is number => n !== null))]
  return nums.sort((a, b) => a - b)
}

export async function upsertKanjiSRSCard(userId: string, char: string): Promise<void> {
  await initSRSCard(userId, char, 'kanji', null)
}

export async function updateKanjiSRSCard(userId: string, char: string, updates: Partial<SRSCard>): Promise<void> {
  const existing = await db.srs_cards.get([userId, char])
  if (!existing)
    return
  await upsertSRSCard({ ...existing, ...updates })
}

export async function getKanjiByChars(chars: string[]): Promise<KanjiItem[]> {
  if (chars.length === 0)
    return []
  const results = await db.kanji.bulkGet(chars)
  return results.filter((k): k is KanjiItem => k !== undefined)
}

export async function getVocabContainingChars(chars: string[]): Promise<VocabItem[]> {
  const all = await db.vocabulary.toArray()
  return all.filter(v => v.word != null && chars.some(c => v.word!.includes(c)))
}
