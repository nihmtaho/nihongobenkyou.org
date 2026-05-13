import type { KanjiItem } from '../../types/kanji'
import type { SRSCard } from '../../types/srs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KanjiCard } from './KanjiCard'

const baseKanji: KanjiItem = {
  char: '日',
  jlpt_level: 'N5',
  radical: '日',
  stroke_count: 4,
  onyomi: ['ニチ', 'ジツ'],
  kunyomi: ['ひ', 'か'],
  meaning_en: ['sun', 'day', 'Japan'],
  meaning_vi: ['mặt trời', 'ngày'],
  han_viet: 'Nhật',
  lesson_number: 1,
  mnemonic_vi: null,
  components: null,
  stroke_paths: null,
  examples: null,
  related_vocab: null,
}

const baseCard: SRSCard = {
  cardId: '日',
  cardType: 'kanji',
  deckId: null,
  userId: 'u1',
  state: 'learning',
  stability: 1,
  difficulty: 5,
  elapsed_days: 0,
  scheduled_days: 1,
  reps: 1,
  lapses: 0,
  last_review: '2026-04-26T00:00:00Z',
  due: '2026-04-27',
  last_rating: 3,
  pending_sync: false,
  updated_at: '2026-04-26T00:00:00Z',
  consecutive_correct: 0,
  is_known: false,
}

describe('kanjiCard', () => {
  it('renders the kanji character', () => {
    render(<KanjiCard kanji={baseKanji} />)
    expect(screen.getByText('日')).toBeTruthy()
  })

  it('renders han_viet when present', () => {
    render(<KanjiCard kanji={baseKanji} />)
    expect(screen.getByText('Nhật')).toBeTruthy()
  })

  it('renders "—" when han_viet is null', () => {
    render(<KanjiCard kanji={{ ...baseKanji, han_viet: null }} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows "New" badge when no card prop', () => {
    render(<KanjiCard kanji={baseKanji} />)
    expect(screen.getByText('New')).toBeTruthy()
  })

  it('shows "Learning" badge for scheduled_days < 7', () => {
    render(<KanjiCard kanji={baseKanji} card={{ ...baseCard, scheduled_days: 3 }} />)
    expect(screen.getByText('Learning')).toBeTruthy()
  })

  it('shows "Review" badge for scheduled_days 7–20', () => {
    render(<KanjiCard kanji={baseKanji} card={{ ...baseCard, scheduled_days: 14 }} />)
    expect(screen.getByText('Review')).toBeTruthy()
  })

  it('shows "Mature" badge for scheduled_days >= 21', () => {
    render(<KanjiCard kanji={baseKanji} card={{ ...baseCard, scheduled_days: 21 }} />)
    expect(screen.getByText('Mature')).toBeTruthy()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<KanjiCard kanji={baseKanji} onClick={onClick} />)
    screen.getByText('日').closest('button')?.click()
    expect(onClick).toHaveBeenCalledOnce()
  })
})
