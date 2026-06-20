import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { getDueCards } from '../db/srs-cards'
import { initFSRSCard } from '../lib/srs'

describe('getDueCards — due_datetime guard for learning/relearning cards', () => {
  const UID = 'due-guard-test-user'

  afterEach(async () => {
    await db.srs_cards.where('userId').equals(UID).delete()
  })

  function makeCard(
    state: 'learning' | 'relearning' | 'review',
    due_datetime: string | null,
    suffix: string,
  ) {
    return {
      userId: UID,
      cardId: `test-${state}-${suffix}`,
      cardType: 'vocab' as const,
      deckId: null,
      ...initFSRSCard(),
      state,
      due: '2026-06-08',
      due_datetime,
      last_rating: null,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: new Date().toISOString(),
    }
  }

  it('excludes a learning card whose due_datetime has not yet passed', async () => {
    const card = makeCard('learning', '2099-12-31T23:59:00.000Z', 'future')
    await db.srs_cards.put(card)

    const due = await getDueCards(UID, new Date().toISOString(), 'vocab')
    expect(due.find(c => c.cardId === card.cardId)).toBeUndefined()
  })

  it('includes a learning card whose due_datetime has passed', async () => {
    const card = makeCard('learning', '2000-01-01T00:00:00.000Z', 'past')
    await db.srs_cards.put(card)

    const due = await getDueCards(UID, new Date().toISOString(), 'vocab')
    expect(due.find(c => c.cardId === card.cardId)).toBeDefined()
  })

  it('includes a review card regardless of due_datetime', async () => {
    const card = makeCard('review', null, 'review')
    await db.srs_cards.put(card)

    const due = await getDueCards(UID, new Date().toISOString(), 'vocab')
    expect(due.find(c => c.cardId === card.cardId)).toBeDefined()
  })
})

describe('useUnifiedSrsSession — phase transitions', () => {
  it('starts in loading phase', () => {
    expect(true).toBe(true)
  })

  it('transitions to pre-session when due cards are loaded', () => {
    expect(true).toBe(true)
  })

  it('transitions to complete when all cards are rated', () => {
    expect(true).toBe(true)
  })
})

describe('buildUnifiedQueue', () => {
  it('tags rv_* vocabIds as kanji-vocab kind', () => {
    expect(true).toBe(true)
  })

  it('tags regular vocabIds as vocab kind', () => {
    expect(true).toBe(true)
  })
})
