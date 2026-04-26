import type { CustomDeck } from '../types/custom-deck'
import { MAX_DECKS_PER_USER, SHARE_CODE_LENGTH } from '../lib/constants'
import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function classifyError(error: { message: string, status?: number, code?: string }): never {
  if (error.status === 401 || error.code === 'PGRST301')
    throw new AuthError(error.message)
  throw new NetworkError(error.message)
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: SHARE_CODE_LENGTH }, () =>
    chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function fetchDecks(userId: string): Promise<CustomDeck[]> {
  const { data, error } = await supabase
    .from('custom_decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error)
    classifyError(error)
  return data as CustomDeck[]
}

export async function createDeck(
  userId: string,
  input: { title: string, description?: string },
): Promise<CustomDeck> {
  const { count, error: countError } = await supabase
    .from('custom_decks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError)
    classifyError(countError)

  if ((count ?? 0) >= MAX_DECKS_PER_USER)
    throw new ValidationError(`Tối đa ${MAX_DECKS_PER_USER} bộ từ vựng`)

  const { data, error } = await supabase
    .from('custom_decks')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      share_code: generateShareCode(),
    })
    .select()
    .single()

  if (error)
    classifyError(error)
  return data as CustomDeck
}

export async function updateDeck(
  deckId: string,
  updates: Partial<Pick<CustomDeck, 'title' | 'description' | 'is_public'>>,
): Promise<CustomDeck> {
  const { data, error } = await supabase
    .from('custom_decks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .select()
    .single()

  if (error)
    classifyError(error)
  return data as CustomDeck
}

export async function deleteDeck(deckId: string): Promise<void> {
  // Delete matching user_cards rows before the deck cascade removes custom_vocabulary
  // custom_vocabulary.id == user_cards.vocab_id for custom words
  const { data: words, error: wordsError } = await supabase
    .from('custom_vocabulary')
    .select('id')
    .eq('deck_id', deckId)

  if (wordsError)
    classifyError(wordsError)

  if (words && words.length > 0) {
    const vocabIds = words.map((w: { id: string }) => w.id)
    const { error: cardsError } = await supabase
      .from('user_cards')
      .delete()
      .in('vocab_id', vocabIds)

    if (cardsError)
      classifyError(cardsError)
  }

  const { error } = await supabase
    .from('custom_decks')
    .delete()
    .eq('id', deckId)

  if (error)
    classifyError(error)
}

export async function fetchDeckByShareCode(shareCode: string): Promise<CustomDeck | null> {
  const { data, error } = await supabase
    .from('custom_decks')
    .select('*')
    .eq('share_code', shareCode)
    .eq('is_public', true)
    .maybeSingle()

  if (error)
    classifyError(error)
  return data as CustomDeck | null
}

export async function importSharedDeck(shareCode: string, userId: string): Promise<CustomDeck> {
  const { count, error: countError } = await supabase
    .from('custom_decks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError)
    classifyError(countError)

  if ((count ?? 0) >= MAX_DECKS_PER_USER)
    throw new ValidationError(`Tối đa ${MAX_DECKS_PER_USER} bộ từ vựng`)

  const source = await fetchDeckByShareCode(shareCode)
  if (!source)
    throw new ValidationError('Bộ từ vựng không tồn tại hoặc đã bị ẩn')

  const { data: sourceWords, error: wordsError } = await supabase
    .from('custom_vocabulary')
    .select('kana, kanji, meaning_vi, meaning_en, pitch_pattern')
    .eq('deck_id', source.id)

  if (wordsError)
    classifyError(wordsError)

  const newDeck = await createDeck(userId, {
    title: source.title,
    description: source.description ?? undefined,
  })

  if (sourceWords && sourceWords.length > 0) {
    const words = sourceWords.map((w: Omit<typeof sourceWords[number], never>) => ({
      ...w,
      deck_id: newDeck.id,
      user_id: userId,
      source: 'imported' as const,
    }))

    const { error: insertError } = await supabase
      .from('custom_vocabulary')
      .insert(words)

    if (insertError)
      classifyError(insertError)
  }

  return newDeck
}
