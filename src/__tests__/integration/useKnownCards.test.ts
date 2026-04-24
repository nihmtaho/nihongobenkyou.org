import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'
import { useKnownCards } from '../../hooks/useKnownCards'

const TEST_USER_ID = 'test-user-known-002'
const PAST_DATE = '2020-01-01T00:00:00.000Z'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(async () => {
  await db.user_cards.clear()
})

afterEach(async () => {
  await db.user_cards.clear()
})

describe('useKnownCards', () => {
  it('creates a card with is_known true when card does not exist', async () => {
    const vocab = sampleVocabulary[0]
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useKnownCards(), { wrapper })

    await result.current.toggleKnown(TEST_USER_ID, vocab.vocab_id, false)

    const card = await db.user_cards.get([TEST_USER_ID, vocab.vocab_id])
    expect(card?.is_known).toBe(true)
    expect(card?.pending_sync).toBe(true)
  })

  it('toggle is_known true excludes card from useDueCards', async () => {
    const vocab = sampleVocabulary[0]

    await db.user_cards.put({
      userId: TEST_USER_ID,
      vocabId: vocab.vocab_id,
      interval_days: 1,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 1,
      last_rating: 2,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: false,
    })

    const wrapper = makeWrapper()
    const { result: knownResult } = renderHook(() => useKnownCards(), { wrapper })
    await knownResult.current.toggleKnown(TEST_USER_ID, vocab.vocab_id, false)

    const { result: dueResult } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper })
    await waitFor(() => expect(dueResult.current.isSuccess).toBe(true))
    expect(dueResult.current.data).toHaveLength(0)
  })

  it('toggle is_known false re-includes card in useDueCards', async () => {
    const vocab = sampleVocabulary[1]

    await db.user_cards.put({
      userId: TEST_USER_ID,
      vocabId: vocab.vocab_id,
      interval_days: 1,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 1,
      last_rating: 2,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: true,
    })

    const wrapper = makeWrapper()
    const { result: knownResult } = renderHook(() => useKnownCards(), { wrapper })
    await knownResult.current.toggleKnown(TEST_USER_ID, vocab.vocab_id, true)

    const { result: dueResult } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper })
    await waitFor(() => expect(dueResult.current.isSuccess).toBe(true))
    expect(dueResult.current.data).toHaveLength(1)
  })
})
