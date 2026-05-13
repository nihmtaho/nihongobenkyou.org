import type { SRSCard } from '../../types/srs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'

const TEST_USER_ID = 'test-user-001'
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

describe('useDueCards', () => {
  it('excludes cards where is_known is true', async () => {
    const vocab = sampleVocabulary[0]
    await db.srs_cards.put(makeCard(vocab.vocab_id, { is_known: true }))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('includes cards where is_known is false', async () => {
    const vocab = sampleVocabulary[1]
    await db.srs_cards.put(makeCard(vocab.vocab_id, { is_known: false }))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })

  it('includes new cards (reps=0, due in past)', async () => {
    const vocab = sampleVocabulary[2]
    await db.srs_cards.put(makeCard(vocab.vocab_id, { reps: 0, last_rating: null, state: 'new' }))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})
