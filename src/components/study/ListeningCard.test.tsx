import type { VocabWithSRS } from '../../types/vocabulary'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListeningCard } from './ListeningCard'

function makeCard(id: string, reading: string): VocabWithSRS {
  return {
    vocab_id: id,
    word: null,
    reading,
    romaji: reading,
    meaning_en: 'meaning',
    meaning_vi: 'nghĩa',
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: `${id}.mp3`,
    pos: [],
    jlpt_level: 5,
    book_source: 'minna_shokyuu_1',
    lesson_number: 1,
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
    consecutive_correct: 0,
  }
}

const card = makeCard('mnn1_target', 'たべます')
const distractors = [
  makeCard('mnn1_d1', 'みます'),
  makeCard('mnn1_d2', 'きます'),
  makeCard('mnn1_d3', 'かきます'),
]

describe('listeningCard', () => {
  it('shows ??? labels before answer is submitted', () => {
    render(
      <ListeningCard
        card={card}
        distractors={distractors}
        playbackRate={1.0}
        onRateChange={vi.fn()}
        onRate={vi.fn()}
      />,
    )
    const buttons = screen.getAllByText('???')
    expect(buttons.length).toBe(4)
  })

  it('reveals word text after selecting an option', async () => {
    const user = userEvent.setup()
    render(
      <ListeningCard
        card={card}
        distractors={distractors}
        playbackRate={1.0}
        onRateChange={vi.fn()}
        onRate={vi.fn()}
      />,
    )
    const [firstOption] = screen.getAllByText('???')
    await user.click(firstOption)
    expect(screen.queryAllByText('???').length).toBe(0)
  })

  it('shows rating bar after answer', async () => {
    const user = userEvent.setup()
    render(
      <ListeningCard
        card={card}
        distractors={distractors}
        playbackRate={1.0}
        onRateChange={vi.fn()}
        onRate={vi.fn()}
      />,
    )
    await user.click(screen.getAllByText('???')[0])
    expect(screen.getByRole('button', { name: /again/i })).toBeTruthy()
  })

  it('calls onRate when rating button clicked', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()
    render(
      <ListeningCard
        card={card}
        distractors={distractors}
        playbackRate={1.0}
        onRateChange={vi.fn()}
        onRate={onRate}
      />,
    )
    await user.click(screen.getAllByText('???')[0])
    await user.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledWith(3)
  })

  it('shows unavailability notice when audio_filename is null', () => {
    const noAudioCard = { ...card, audio_filename: null }
    render(
      <ListeningCard
        card={noAudioCard}
        distractors={distractors}
        playbackRate={1.0}
        onRateChange={vi.fn()}
        onRate={vi.fn()}
      />,
    )
    expect(screen.getByText(/audio not available/i)).toBeTruthy()
  })

  it('calls onRateChange when speed selector clicked', async () => {
    const user = userEvent.setup()
    const onRateChange = vi.fn()
    render(
      <ListeningCard
        card={card}
        distractors={distractors}
        playbackRate={1.0}
        onRateChange={onRateChange}
        onRate={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /0.75x/i }))
    expect(onRateChange).toHaveBeenCalledWith(0.75)
  })
})
