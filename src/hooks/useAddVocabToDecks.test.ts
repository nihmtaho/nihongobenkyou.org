import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as customDecksLocal from '../db/custom-decks-local'

import { db } from '../db/schema'
import { useAddVocabToDecks } from './useAddVocabToDecks'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'
import { DECK_WORDS_KEY } from './useCustomDeckWords'
import 'fake-indexeddb/auto'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const USER_ID = 'u-add-test'

function makeWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(async () => {
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
  vi.clearAllMocks()
})

describe('useAddVocabToDecks', () => {
  it('adds parsed vocab to all selected decks', async () => {
    await db.custom_decks.bulkAdd([
      { id: 'd1', user_id: USER_ID, title: 'Deck A', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'd2', user_id: USER_ID, title: 'Deck B', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ])

    const { result } = renderHook(() => useAddVocabToDecks(USER_ID), { wrapper: makeWrapper() })

    await result.current.mutateAsync({
      deckIds: ['d1', 'd2'],
      parsedItem: { word: '食べる', kana: 'たべる', han_viet: null, meaning_vi: 'ăn' },
    })

    const words = await db.custom_vocabulary.toArray()
    expect(words).toHaveLength(2)
    expect(words.map(w => w.deck_id).sort()).toEqual(['d1', 'd2'])
    expect(words[0].kana).toBe('たべる')
  })

  it('fires success toast with correct deck count', async () => {
    const { toast } = await import('sonner')
    await db.custom_decks.add({ id: 'd3', user_id: USER_ID, title: 'D', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })

    const { result } = renderHook(() => useAddVocabToDecks(USER_ID), { wrapper: makeWrapper() })
    await result.current.mutateAsync({
      deckIds: ['d3'],
      parsedItem: { word: null, kana: 'きれい', han_viet: null, meaning_vi: 'đẹp' },
    })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã thêm vào 1 deck'))
  })

  it('increments word_count on each deck', async () => {
    await db.custom_decks.add({ id: 'd4', user_id: USER_ID, title: 'D', description: null, is_active: false, word_count: 5, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })

    const { result } = renderHook(() => useAddVocabToDecks(USER_ID), { wrapper: makeWrapper() })
    await result.current.mutateAsync({
      deckIds: ['d4'],
      parsedItem: { word: null, kana: 'あか', han_viet: null, meaning_vi: 'đỏ' },
    })

    const deck = await db.custom_decks.get('d4')
    expect(deck?.word_count).toBe(6)
  })

  it('fires error toast when adding to a deck fails (partial failure)', async () => {
    const { toast } = await import('sonner')

    const addWordsSpy = vi.spyOn(customDecksLocal, 'addWords').mockRejectedValueOnce(new Error('DB error'))

    await db.custom_decks.bulkAdd([
      { id: 'd5a', user_id: USER_ID, title: 'D', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'd5b', user_id: USER_ID, title: 'D', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ])

    const { result } = renderHook(() => useAddVocabToDecks(USER_ID), { wrapper: makeWrapper() })

    // First deck fails, second succeeds
    await result.current.mutateAsync({
      deckIds: ['d5a', 'd5b'],
      parsedItem: { word: null, kana: 'あか', han_viet: null, meaning_vi: 'đỏ' },
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Đã thêm vào 1 deck')
      expect(toast.error).toHaveBeenCalledWith('Không thêm được vào 1 deck')
    })
    addWordsSpy.mockRestore()
  })

  it('invalidates cache for affected decks and custom_decks on success', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    await db.custom_decks.add({ id: 'd6', user_id: USER_ID, title: 'Deck A', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })

    const { result } = renderHook(() => useAddVocabToDecks(USER_ID), { wrapper: makeWrapper(qc) })
    await result.current.mutateAsync({
      deckIds: ['d6'],
      parsedItem: { word: '走る', kana: 'はしる', han_viet: null, meaning_vi: 'chạy' },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: DECK_WORDS_KEY('d6') })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CUSTOM_DECKS_KEY(USER_ID) })
    })
  })

  it('does not invalidate cache when all decks fail', async () => {
    const { toast } = await import('sonner')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const addWordsSpy = vi.spyOn(customDecksLocal, 'addWords').mockRejectedValue(new Error('DB error'))

    await db.custom_decks.bulkAdd([
      { id: 'd7', user_id: USER_ID, title: 'Deck A', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'd8', user_id: USER_ID, title: 'Deck B', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ])

    const { result } = renderHook(() => useAddVocabToDecks(USER_ID), { wrapper: makeWrapper(qc) })

    await expect(result.current.mutateAsync({
      deckIds: ['d7', 'd8'],
      parsedItem: { word: '学ぶ', kana: 'まなぶ', han_viet: null, meaning_vi: 'học' },
    })).rejects.toThrow('Failed to add vocab to all 2 decks')

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Không thêm được vào bất kỳ deck nào')
      expect(invalidateSpy).not.toHaveBeenCalled()
    })

    addWordsSpy.mockRestore()
  })
})
