import type { VocabWithSRS } from '../../types/vocabulary'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PitchDiscriminationCard } from './PitchDiscriminationCard'

function makeCard(overrides: Partial<VocabWithSRS> = {}): VocabWithSRS {
  return {
    vocab_id: 'mnn1_test001',
    word: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    meaning_en: 'to eat',
    meaning_vi: 'ăn',
    pitch_pattern: 2,
    pitch_type: 'nakadaka',
    audio_filename: 'taberu.mp3',
    audio_filename_alt: 'taberu_alt.mp3',
    pos: [],
    jlpt_level: 5,
    book_source: 'minna_shokyuu_1',
    lesson_number: 3,
    examples: [],
    tags: [],
    deprecated: false,
    state: 'new' as const,
    stability: 0,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 0,
    lapses: 0,
    last_review: '2026-04-26T00:00:00Z',
    due: '2026-04-27',
    last_rating: null,
    pending_sync: false,
    updated_at: '2026-04-26T00:00:00Z',
    is_known: false,
    ...overrides,
    consecutive_correct: overrides.consecutive_correct ?? 0,
  }
}

describe('pitchDiscriminationCard', () => {
  it('shows kana reading', () => {
    render(<PitchDiscriminationCard card={makeCard()} onRate={vi.fn()} />)
    expect(screen.getByText('たべる')).toBeTruthy()
  })

  it('shows two audio buttons A and B', () => {
    render(<PitchDiscriminationCard card={makeCard()} onRate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^A$/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^B$/ })).toBeTruthy()
  })

  it('shows unavailability notice when audio_filename is null', () => {
    render(<PitchDiscriminationCard card={makeCard({ audio_filename: null })} onRate={vi.fn()} />)
    expect(screen.getByText(/dual-audio not available/i)).toBeTruthy()
  })

  it('shows unavailability notice when audio_filename_alt is null', () => {
    render(<PitchDiscriminationCard card={makeCard({ audio_filename_alt: null })} onRate={vi.fn()} />)
    expect(screen.getByText(/dual-audio not available/i)).toBeTruthy()
  })

  it('shows rating bar after selecting an option', async () => {
    const user = userEvent.setup()
    render(<PitchDiscriminationCard card={makeCard()} onRate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /^A$/ }))
    expect(screen.getByRole('button', { name: /again/i })).toBeTruthy()
  })

  it('calls onRate when rating button clicked', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()
    render(<PitchDiscriminationCard card={makeCard()} onRate={onRate} />)
    await user.click(screen.getByRole('button', { name: /^A$/ }))
    await user.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledWith(3)
  })
})
