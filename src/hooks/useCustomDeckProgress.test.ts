import type { SRSCard } from '../types/srs'

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

const TODAY = new Date().toISOString().slice(0, 10)

function makeSRSCard(
  cardId: string,
  scheduled_days: number,
  reps: number,
  due: string,
): SRSCard {
  return {
    userId:              'u1',
    cardId,
    cardType:            'custom_vocab',
    deckId:              'deck1',
    state:               reps > 0 ? 'review' : 'new',
    stability:           1.5,
    difficulty:          5.0,
    elapsed_days:        2,
    scheduled_days,
    reps,
    lapses:              0,
    last_review:         TODAY,
    due,
    last_rating:         reps > 0 ? 3 : null,
    is_known:            false,
    consecutive_correct: reps,
    pending_sync:        false,
    updated_at:          new Date().toISOString(),
  }
}

beforeEach(async () => {
  await db.srs_cards.clear()
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
  await db.srs_cards.bulkAdd([
    // learning: reps >= 1, scheduled_days < 7
    makeSRSCard('a', 1, 2, '2026-01-01'),
    // learned: scheduled_days >= 7, < 21
    makeSRSCard('b', 10, 5, '2026-01-01'),
    // mature: scheduled_days >= 21
    makeSRSCard('c', 30, 8, '2099-01-01'),
    // 4th word has no SRS entry (not started)
  ])
})

describe('useCustomDeckProgress', () => {
  it('computes progress stats correctly', async () => {
    const { result } = renderHook(() => useCustomDeckProgress('u1', 'deck1'), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const d = result.current.data!
    expect(d.total).toBe(4) // word_count from custom_decks
    expect(d.started).toBe(3) // 3 entries have reps >= 1
    expect(d.learning).toBe(1) // entry a: reps=2, scheduled_days 1 (< 7)
    expect(d.learned).toBe(1) // entry b: scheduled_days 10 (7 to <21)
    expect(d.mature).toBe(1) // entry c: scheduled_days 30 (>= 21)
    expect(d.dueToday).toBe(2) // entries a and b have due '2026-01-01' (past); c has '2099-01-01'
    expect(d.percentComplete).toBe(50) // (learned + mature) / total = 2/4 * 100
    expect(d.nextDueDateStr).toBe('2099-01-01') // c is due in future, only future date
  })

  it('returns 0% when SRS entries exist but none have been reviewed (reps=0)', async () => {
    await db.srs_cards.clear()
    // Simulate pre-created SRS entries that haven't been rated yet
    await db.srs_cards.bulkAdd([
      makeSRSCard('x', 0, 0, TODAY),
      makeSRSCard('y', 0, 0, TODAY),
    ])
    const { result } = renderHook(() => useCustomDeckProgress('u1', 'deck1'), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const d = result.current.data!
    expect(d.started).toBe(0)
    expect(d.learning).toBe(0)
    expect(d.percentComplete).toBe(0)
  })
})
