import type { VocabWithSRS } from '../../types/vocabulary'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { highlightSentence } from '../../lib/sentence-highlight'
import { SentenceFlashcard } from './SentenceFlashcard'

function makeCard(overrides: Partial<VocabWithSRS> = {}): VocabWithSRS {
  return {
    vocab_id: 'mnn1_test001',
    word: '食べます',
    reading: 'たべます',
    romaji: 'tabemasu',
    meaning_en: 'to eat',
    meaning_vi: 'ăn',
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: null,
    pos: [],
    jlpt_level: 5,
    book_source: 'minna_shokyuu_1',
    lesson_number: 3,
    examples: [
      { ja: 'まいにち食べます。', en: 'I eat every day.', vi: 'Tôi ăn mỗi ngày.' },
    ],
    tags: [],
    deprecated: false,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: '2026-04-27',
    review_count: 0,
    last_rating: null,
    pending_sync: false,
    updated_at: '2026-04-26T00:00:00Z',
    is_known: false,
    ...overrides,
  }
}

describe('highlightSentence', () => {
  it('splits sentence around the kanji word', () => {
    const parts = highlightSentence('まいにち食べます。', '食べます')
    expect(parts).toEqual(['まいにち', '食べます', '。'])
  })

  it('falls back to reading when word is null', () => {
    const parts = highlightSentence('まいにちたべます。', 'たべます')
    expect(parts).toEqual(['まいにち', 'たべます', '。'])
  })

  it('returns [sentence] when target not found', () => {
    const parts = highlightSentence('わたしはがくせいです。', '食べます')
    expect(parts).toEqual(['わたしはがくせいです。'])
  })
})

describe('sentenceFlashcard', () => {
  it('shows example sentence on front face', () => {
    const card = makeCard()
    render(<SentenceFlashcard card={card} meaningLanguage="vi" onRate={vi.fn()} />)
    expect(screen.getByText('まいにち')).toBeTruthy()
    expect(screen.getByText('食べます')).toBeTruthy()
  })

  it('falls back to word reading when no examples', () => {
    const card = makeCard({ examples: [] })
    render(<SentenceFlashcard card={card} meaningLanguage="vi" onRate={vi.fn()} />)
    expect(screen.getByText('食べます')).toBeTruthy()
  })

  it('reveals rating buttons after flip', async () => {
    const user = userEvent.setup()
    const card = makeCard()
    render(<SentenceFlashcard card={card} meaningLanguage="vi" onRate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /flip/i }))
    expect(screen.getByRole('button', { name: /again/i })).toBeTruthy()
  })

  it('calls onRate with the selected rating', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()
    const card = makeCard()
    render(<SentenceFlashcard card={card} meaningLanguage="vi" onRate={onRate} />)
    await user.click(screen.getByRole('button', { name: /flip/i }))
    await user.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledWith(2)
  })
})
