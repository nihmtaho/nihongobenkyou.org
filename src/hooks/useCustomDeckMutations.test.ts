import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { addWords, createDeck } from '../db/custom-decks-local'
import { db } from '../db/schema'
import { MAX_DECKS_PER_USER, MAX_WORDS_PER_DECK } from '../lib/constants'
import { useCustomDeckMutations } from './useCustomDeckMutations'
import 'fake-indexeddb/auto'

const USER_ID = 'u1'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(async () => {
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

describe('deck and word count limits', () => {
  const UID = 'limit-test-user'

  beforeEach(async () => {
    await db.custom_decks.clear()
    await db.custom_vocabulary.clear()
  })

  it('throws DECK_LIMIT_REACHED when user has MAX_DECKS_PER_USER decks', async () => {
    const decks = Array.from({ length: MAX_DECKS_PER_USER }, (_, i) => ({
      id: `deck-limit-${i}`,
      user_id: UID,
      title: `Deck ${i}`,
      description: null,
      is_active: false,
      word_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    await db.custom_decks.bulkAdd(decks)

    await expect(createDeck(UID, { title: 'One more' }))
      .rejects
      .toThrow('DECK_LIMIT_REACHED')
  })

  it('throws WORD_LIMIT_REACHED when adding would exceed MAX_WORDS_PER_DECK', async () => {
    await db.custom_decks.add({
      id: 'deck-word-limit',
      user_id: UID,
      title: 'Full Deck',
      description: null,
      is_active: false,
      word_count: MAX_WORDS_PER_DECK - 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const items = [
      { kana: 'てすと', word: null, han_viet: null, meaning_vi: 'test' },
      { kana: 'もう', word: null, han_viet: null, meaning_vi: 'already' },
    ]

    await expect(addWords('deck-word-limit', UID, items))
      .rejects
      .toThrow('WORD_LIMIT_REACHED')
  })

  it('allows creating a deck when under the limit', async () => {
    await expect(createDeck(UID, { title: 'OK Deck' })).resolves.toBeDefined()
  })
})

describe('useCustomDeckMutations', () => {
  it('createDeck adds deck to Dexie', async () => {
    const { result } = renderHook(() => useCustomDeckMutations(USER_ID), { wrapper: makeWrapper() })
    await result.current.createDeck.mutateAsync({ title: 'Test' })
    const decks = await db.custom_decks.where('user_id').equals(USER_ID).toArray()
    expect(decks).toHaveLength(1)
    expect(decks[0].title).toBe('Test')
  })

  it('deleteDeck removes deck from Dexie', async () => {
    const { result } = renderHook(() => useCustomDeckMutations(USER_ID), { wrapper: makeWrapper() })
    const d = await result.current.createDeck.mutateAsync({ title: 'ToDelete' })
    await result.current.deleteDeck.mutateAsync(d.id)
    expect(await db.custom_decks.get(d.id)).toBeUndefined()
  })

  it('toggleActive flips is_active', async () => {
    const { result } = renderHook(() => useCustomDeckMutations(USER_ID), { wrapper: makeWrapper() })
    const d = await result.current.createDeck.mutateAsync({ title: 'D' })
    await result.current.toggleActive.mutateAsync(d.id)
    expect((await db.custom_decks.get(d.id))?.is_active).toBe(true)
    await result.current.toggleActive.mutateAsync(d.id)
    expect((await db.custom_decks.get(d.id))?.is_active).toBe(false)
  })
})
