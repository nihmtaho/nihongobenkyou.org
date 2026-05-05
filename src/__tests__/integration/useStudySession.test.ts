import type { UnifiedCard } from '../../types/unified-card'
import type { VocabWithSRS } from '../../types/vocabulary'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { useStudySessionStore } from '../../stores/studySessionStore'

const NOW = new Date().toISOString()
const TODAY = NOW.slice(0, 10)

function makeCard(vocab: (typeof sampleVocabulary)[number]): UnifiedCard {
  const vocabWithSrs: VocabWithSRS = {
    ...vocab,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: TODAY,
    review_count: 0,
    last_rating: null,
    pending_sync: false,
    updated_at: NOW,
    is_known: false,
    consecutive_correct: 0,
  }
  return { kind: 'vocab', card: vocabWithSrs }
}

beforeEach(() => {
  useStudySessionStore.getState().resetSession()
})

afterEach(() => {
  useStudySessionStore.getState().resetSession()
})

describe('studySessionStore — retry flow', () => {
  it('initSession sets queue, mode, and resets stats', () => {
    const cards = sampleVocabulary.slice(0, 3).map(makeCard)
    useStudySessionStore.getState().initSession(cards, 'flashcard')

    const { queue, currentIndex, mode, stats } = useStudySessionStore.getState()
    expect(queue).toHaveLength(3)
    expect(currentIndex).toBe(0)
    expect(mode).toBe('flashcard')
    expect(stats.correct).toBe(0)
    expect(stats.total).toBe(0)
    expect(stats.wrongCards).toHaveLength(0)
  })

  it('markCorrect increments correct and total', () => {
    const cards = sampleVocabulary.slice(0, 2).map(makeCard)
    useStudySessionStore.getState().initSession(cards, 'quiz')
    useStudySessionStore.getState().markCorrect()

    const { stats } = useStudySessionStore.getState()
    expect(stats.correct).toBe(1)
    expect(stats.total).toBe(1)
  })

  it('markWrong appends card to queue and wrongCards', () => {
    const cards = sampleVocabulary.slice(0, 3).map(makeCard)
    useStudySessionStore.getState().initSession(cards, 'flashcard')
    useStudySessionStore.getState().markWrong(cards[0])

    const { queue, stats } = useStudySessionStore.getState()
    expect(queue).toHaveLength(4)
    expect(queue[3]).toEqual(cards[0])
    expect(stats.wrongCards).toHaveLength(1)
    expect(stats.total).toBe(1)
    expect(stats.correct).toBe(0)
  })

  it('requeueWrongCards resets queue to wrongCards and clears stats', () => {
    const cards = sampleVocabulary.slice(0, 3).map(makeCard)
    useStudySessionStore.getState().initSession(cards, 'flashcard')
    useStudySessionStore.getState().markCorrect()
    useStudySessionStore.getState().markWrong(cards[1])
    useStudySessionStore.getState().markWrong(cards[2])

    useStudySessionStore.getState().requeueWrongCards()

    const { queue, currentIndex, stats } = useStudySessionStore.getState()
    expect(queue).toHaveLength(2)
    expect(queue[0]).toEqual(cards[1])
    expect(queue[1]).toEqual(cards[2])
    expect(currentIndex).toBe(0)
    expect(stats.correct).toBe(0)
    expect(stats.total).toBe(0)
    expect(stats.wrongCards).toHaveLength(0)
  })

  it('requeueWrongCards with no wrong cards produces empty queue', () => {
    const cards = sampleVocabulary.slice(0, 2).map(makeCard)
    useStudySessionStore.getState().initSession(cards, 'quiz')
    useStudySessionStore.getState().markCorrect()
    useStudySessionStore.getState().markCorrect()

    useStudySessionStore.getState().requeueWrongCards()

    const { queue, currentIndex } = useStudySessionStore.getState()
    expect(queue).toHaveLength(0)
    expect(currentIndex).toBe(0)
  })

  it('advanceCard increments currentIndex', () => {
    const cards = sampleVocabulary.slice(0, 3).map(makeCard)
    useStudySessionStore.getState().initSession(cards, 'flashcard')
    useStudySessionStore.getState().advanceCard()
    useStudySessionStore.getState().advanceCard()

    expect(useStudySessionStore.getState().currentIndex).toBe(2)
  })
})
