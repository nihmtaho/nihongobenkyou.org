import type { SRSCard } from '../../types/srs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'
import { useKnownCards } from '../../hooks/useKnownCards'

const TEST_USER_ID = 'test-user-known-002'
const PAST_DATE = '2020-01-01'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeCard(vocabId: string, overrides: Partial<SRSCard> = {}): SRSCard {
  return {
    userId: TEST_USER_ID,
    cardId: vocabId,
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    last_review: PAST_DATE,
    due: PAST_DATE,
    last_rating: 3,
    is_known: false,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: `${PAST_DATE}T00:00:00Z`,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.srs_cards.clear()
})

afterEach(async () => {
  await db.srs_cards.clear()
})

describe('useKnownCards', () => {
  it('creates a card with is_known true when card does not exist', async () => {
    const vocab = sampleVocabulary[0]
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useKnownCards(), { wrapper })

    await result.current.toggleKnown(TEST_USER_ID, vocab.vocab_id, false)

    const card = await db.srs_cards.get([TEST_USER_ID, vocab.vocab_id])
    expect(card?.is_known).toBe(true)
    expect(card?.pending_sync).toBe(true)
  })

  it('toggle is_known true excludes card from useDueCards', async () => {
    const vocab = sampleVocabulary[0]
    await db.srs_cards.put(makeCard(vocab.vocab_id, { is_known: false }))

    const wrapper = makeWrapper()
    const { result: knownResult } = renderHook(() => useKnownCards(), { wrapper })
    await knownResult.current.toggleKnown(TEST_USER_ID, vocab.vocab_id, false)

    const { result: dueResult } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper })
    await waitFor(() => expect(dueResult.current.isSuccess).toBe(true))
    expect(dueResult.current.data).toHaveLength(0)
  })

  it('toggle is_known false re-includes card in useDueCards', async () => {
    const vocab = sampleVocabulary[1]
    await db.srs_cards.put(makeCard(vocab.vocab_id, { is_known: true }))

    const wrapper = makeWrapper()
    const { result: knownResult } = renderHook(() => useKnownCards(), { wrapper })
    await knownResult.current.toggleKnown(TEST_USER_ID, vocab.vocab_id, true)

    const { result: dueResult } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper })
    await waitFor(() => expect(dueResult.current.isSuccess).toBe(true))
    expect(dueResult.current.data).toHaveLength(1)
  })
})
