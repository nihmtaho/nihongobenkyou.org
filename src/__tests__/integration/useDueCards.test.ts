import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'

const TEST_USER_ID = 'test-user-001'
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

describe('useDueCards', () => {
  it('excludes cards where is_known is true', async () => {
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
      is_known: true,
    })

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('includes cards where is_known is false', async () => {
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
      is_known: false,
    })

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })

  it('includes cards where is_known is undefined', async () => {
    const vocab = sampleVocabulary[2]

    await db.user_cards.put({
      userId: TEST_USER_ID,
      vocabId: vocab.vocab_id,
      interval_days: 1,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 0,
      last_rating: null,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: false,
    })

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})
