import type { CsvImportResult, CsvRow, CustomVocabItem } from '../types/custom-deck'
import { MAX_WORDS_PER_DECK } from '../lib/constants'
import { lookupPitch } from '../lib/pitch-lookup'
import { AuthError, NetworkError } from './auth'
import { ValidationError } from './custom-decks'
import { supabase } from './supabase'

function classifyError(error: { message: string, status?: number, code?: string }): never {
  if (error.status === 401 || error.code === 'PGRST301')
    throw new AuthError(error.message)
  throw new NetworkError(error.message)
}

export async function fetchWords(deckId: string): Promise<CustomVocabItem[]> {
  const { data, error } = await supabase
    .from('custom_vocabulary')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

  if (error)
    classifyError(error)
  return data as CustomVocabItem[]
}

export async function addWord(
  deckId: string,
  userId: string,
  input: { kana: string, kanji?: string, meaning_vi: string, meaning_en?: string },
): Promise<CustomVocabItem> {
  const { count, error: countError } = await supabase
    .from('custom_vocabulary')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', deckId)

  if (countError)
    classifyError(countError)

  if ((count ?? 0) >= MAX_WORDS_PER_DECK)
    throw new ValidationError(`Tối đa ${MAX_WORDS_PER_DECK} từ mỗi bộ`)

  const { data, error } = await supabase
    .from('custom_vocabulary')
    .insert({
      deck_id: deckId,
      user_id: userId,
      kana: input.kana,
      kanji: input.kanji ?? null,
      meaning_vi: input.meaning_vi,
      meaning_en: input.meaning_en ?? null,
      pitch_pattern: null,
      source: 'manual',
    })
    .select()
    .single()

  if (error)
    classifyError(error)

  const word = data as CustomVocabItem

  // Client-side pitch lookup — fire-and-forget, word already saved with null
  void lookupPitch(word.kana, word.kanji ?? null).then((pitch) => {
    if (pitch === null)
      return
    void supabase
      .from('custom_vocabulary')
      .update({ pitch_pattern: pitch })
      .eq('id', word.id)
  })

  return word
}

export async function deleteWord(wordId: string): Promise<void> {
  // Remove matching user_cards rows first (no FK from user_cards to custom_vocabulary)
  await supabase.from('user_cards').delete().eq('vocab_id', wordId)

  const { error } = await supabase
    .from('custom_vocabulary')
    .delete()
    .eq('id', wordId)

  if (error)
    classifyError(error)
}

export async function bulkImport(
  deckId: string,
  userId: string,
  rows: CsvRow[],
): Promise<CsvImportResult> {
  const { count: currentCount, error: countError } = await supabase
    .from('custom_vocabulary')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', deckId)

  if (countError)
    classifyError(countError)

  // Fetch existing kana values to detect duplicates
  const { data: existingWords, error: existingError } = await supabase
    .from('custom_vocabulary')
    .select('kana')
    .eq('deck_id', deckId)

  if (existingError)
    classifyError(existingError)

  const existingKana = new Set((existingWords ?? []).map((w: { kana: string }) => w.kana))
  const available = MAX_WORDS_PER_DECK - (currentCount ?? 0)

  const errors: CsvImportResult['errors'] = []
  let skipped = 0
  const toInsert: object[] = []

  rows.forEach((row, i) => {
    const rowNumber = i + 1

    if (existingKana.has(row.kana)) {
      errors.push({ row: rowNumber, reason: `Từ "${row.kana}" đã có trong bộ` })
      skipped++
      return
    }

    if (toInsert.length >= available) {
      errors.push({ row: rowNumber, reason: `Đã đạt giới hạn ${MAX_WORDS_PER_DECK} từ` })
      skipped++
      return
    }

    existingKana.add(row.kana)
    toInsert.push({
      deck_id: deckId,
      user_id: userId,
      kana: row.kana,
      kanji: row.kanji ?? null,
      meaning_vi: row.meaning_vi,
      meaning_en: row.meaning_en ?? null,
      pitch_pattern: null,
      source: 'csv',
    })
  })

  if (toInsert.length > 0) {
    const { error } = await supabase.from('custom_vocabulary').insert(toInsert)
    if (error)
      classifyError(error)
  }

  return { imported: toInsert.length, skipped, errors }
}
