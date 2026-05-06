import type { CustomDeckSRS } from '../types/custom-deck'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/schema'
import { useCustomDeckProgress } from './useCustomDeckProgress'
import 'fake-indexeddb/auto'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(async () => {
  await db.custom_deck_srs.clear()
  await db.custom_decks.clear()
  // seed a custom deck with word_count=4
  await db.custom_decks.add({
    id: 'deck1',
    user_id: 'u1',
    title: 'Test',
    description: null,
    is_active: false,
    word_count: 4,
    created_at: '',
    updated_at: '',
  })
  const makeEntry = (itemId: string, interval_days: number, review_count: number, due_date: string): CustomDeckSRS => ({
    userId: 'u1',
    itemId,
    deckId: 'deck1',
    interval_days,
    ease_factor: 2.5,
    due_date,
    review_count,
    card_stage: 'review',
    learning_step: 0,
    lapse_count: 0,
    last_rating: 2,
    consecutive_correct: review_count,
    pending_sync: false,
    updated_at: '',
  })
  await db.custom_deck_srs.bulkAdd([
    // learning: review_count >= 1, interval_days < 7
    makeEntry('a', 1, 2, '2026-01-01'),
    // learned: interval_days >= 7, < 21
    makeEntry('b', 10, 5, '2026-01-01'),
    // mature: interval_days >= 21
    makeEntry('c', 30, 8, '2099-01-01'),
    // 4th word has no SRS entry (not started)
  ])
})

describe('useCustomDeckProgress', () => {
  it('computes progress stats correctly', async () => {
    const { result } = renderHook(() => useCustomDeckProgress('u1', 'deck1'), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const d = result.current.data!
    expect(d.total).toBe(4) // word_count from custom_decks
    expect(d.started).toBe(3) // 3 have SRS entries with review_count >= 1
    expect(d.learned).toBe(1) // interval_days 10 (7 to <21)
    expect(d.mature).toBe(1) // interval_days 30 (>= 21)
    expect(d.dueToday).toBe(2) // entries a and b have due_date '2026-01-01' (past); c has '2099-01-01'
    expect(d.percentComplete).toBe(50) // (learned + mature) / total * 100 = 2/4 * 100
  })
})
