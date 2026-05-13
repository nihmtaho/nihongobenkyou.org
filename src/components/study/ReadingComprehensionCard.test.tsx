import type { Passage } from '../../types/passages'
import type { VocabWithSRS } from '../../types/vocabulary'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReadingComprehensionCard } from './ReadingComprehensionCard'

const passage: Passage = {
  passage_id: 'minna_shokyuu_1:3:0',
  book_source: 'minna_shokyuu_1',
  lesson_number: 3,
  text_ja: 'まいにちにほんごをべんきょうします。',
  text_vi: 'Tôi học tiếng Nhật mỗi ngày.',
  vocab_ids: ['mnn1_test001'],
  questions: [
    { question_vi: 'Câu hỏi 1?', options: ['にほんご', 'えいご'], correct_index: 0 },
    { question_vi: 'Câu hỏi 2?', options: ['まいにち', 'まいしゅう'], correct_index: 0 },
  ],
}

const card: VocabWithSRS = {
  vocab_id: 'mnn1_test001',
  word: null,
  reading: 'べんきょうします',
  romaji: 'benkyoushimasu',
  meaning_en: 'to study',
  meaning_vi: 'học',
  pitch_pattern: null,
  pitch_type: null,
  audio_filename: null,
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
  consecutive_correct: 0,
}

describe('readingComprehensionCard', () => {
  it('shows passage text on initial render', () => {
    render(<ReadingComprehensionCard passage={passage} card={card} onRate={vi.fn()} />)
    expect(screen.getByText(/べんきょうします/)).toBeTruthy()
  })

  it('shows "Trả lời" button initially', () => {
    render(<ReadingComprehensionCard passage={passage} card={card} onRate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /trả lời/i })).toBeTruthy()
  })

  it('reveals questions after tapping Trả lời', async () => {
    const user = userEvent.setup()
    render(<ReadingComprehensionCard passage={passage} card={card} onRate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /trả lời/i }))
    expect(screen.getByText('Câu hỏi 1?')).toBeTruthy()
  })

  it('shows results and rating bar after all questions answered', async () => {
    const user = userEvent.setup()
    render(<ReadingComprehensionCard passage={passage} card={card} onRate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /trả lời/i }))
    await user.click(screen.getByRole('button', { name: 'にほんご' }))
    await waitFor(() => screen.getByRole('button', { name: 'まいにち' }))
    await user.click(screen.getByRole('button', { name: 'まいにち' }))
    await user.click(screen.getByRole('button', { name: /xem kết quả/i }))
    expect(screen.getByRole('button', { name: /again/i })).toBeTruthy()
  })

  it('calls onRate when rating button is clicked', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()
    render(<ReadingComprehensionCard passage={passage} card={card} onRate={onRate} />)
    await user.click(screen.getByRole('button', { name: /trả lời/i }))
    await user.click(screen.getByRole('button', { name: 'にほんご' }))
    await waitFor(() => screen.getByRole('button', { name: 'まいにち' }))
    await user.click(screen.getByRole('button', { name: 'まいにち' }))
    await user.click(screen.getByRole('button', { name: /xem kết quả/i }))
    await user.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledWith(2)
  })
})
