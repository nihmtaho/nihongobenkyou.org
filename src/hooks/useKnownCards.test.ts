import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/schema'
import { initSRSCard } from '../db/srs-cards'
import { useKnownCards } from './useKnownCards'

const USER_ID = 'test-user'
const VOCAB_ID = 'mnn1_test0000001'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useKnownCards', () => {
  beforeEach(async () => {
    await db.srs_cards.clear()
  })

  describe('toggleKnown', () => {
    it('marks an existing card as known', async () => {
      await initSRSCard(USER_ID, VOCAB_ID, 'vocab', null)

      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      await act(() => result.current.toggleKnown(USER_ID, VOCAB_ID, false))

      const card = await db.srs_cards.get([USER_ID, VOCAB_ID])
      expect(card?.is_known).toBe(true)
      expect(card?.pending_sync).toBe(true)
    })

    it('marks an existing known card as unknown', async () => {
      await initSRSCard(USER_ID, VOCAB_ID, 'vocab', null)
      await db.srs_cards.where('[userId+cardId]').equals([USER_ID, VOCAB_ID]).modify({ is_known: true })

      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      await act(() => result.current.toggleKnown(USER_ID, VOCAB_ID, true))

      const card = await db.srs_cards.get([USER_ID, VOCAB_ID])
      expect(card?.is_known).toBe(false)
      expect(card?.pending_sync).toBe(true)
    })

    it('creates and marks as known when card does not exist', async () => {
      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      await act(() => result.current.toggleKnown(USER_ID, VOCAB_ID, false))

      const card = await db.srs_cards.get([USER_ID, VOCAB_ID])
      expect(card).toBeDefined()
      expect(card?.is_known).toBe(true)
      expect(card?.pending_sync).toBe(true)
    })
  })

  describe('isKnown', () => {
    it('returns false for unknown card', async () => {
      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      const known = await result.current.isKnown(USER_ID, VOCAB_ID)
      expect(known).toBe(false)
    })

    it('returns true after card is toggled known', async () => {
      await initSRSCard(USER_ID, VOCAB_ID, 'vocab', null)
      await db.srs_cards.where('[userId+cardId]').equals([USER_ID, VOCAB_ID]).modify({ is_known: true })

      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      const known = await result.current.isKnown(USER_ID, VOCAB_ID)
      expect(known).toBe(true)
    })
  })

  describe('knownCount', () => {
    it('returns 0 when no cards are known', async () => {
      await initSRSCard(USER_ID, VOCAB_ID, 'vocab', null)

      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      const count = await result.current.knownCount(USER_ID)
      expect(count).toBe(0)
    })

    it('counts only known vocab cards for the user', async () => {
      await initSRSCard(USER_ID, 'card-1', 'vocab', null)
      await initSRSCard(USER_ID, 'card-2', 'vocab', null)
      await initSRSCard(USER_ID, 'kanji-1', 'kanji', null)
      await db.srs_cards.where('[userId+cardId]').equals([USER_ID, 'card-1']).modify({ is_known: true })
      await db.srs_cards.where('[userId+cardId]').equals([USER_ID, 'kanji-1']).modify({ is_known: true })

      const { result } = renderHook(() => useKnownCards(), { wrapper: makeWrapper() })
      const count = await result.current.knownCount(USER_ID)
      // kanji should not be counted; only vocab
      expect(count).toBe(1)
    })
  })
})
