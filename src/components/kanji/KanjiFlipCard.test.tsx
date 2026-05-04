import type { KanjiCardState, KanjiItem } from '../../types/kanji'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KanjiFlipCard } from './KanjiFlipCard'

const baseKanji: KanjiItem = {
  char: '明',
  jlpt_level: 'N5',
  radical: '日',
  stroke_count: 8,
  onyomi: ['メイ', 'ミョウ'],
  kunyomi: ['あかるい', 'あける'],
  meaning_en: ['bright', 'clear'],
  meaning_vi: ['sáng', 'rõ ràng'],
  han_viet: 'Minh',
  lesson_number: 23,
  mnemonic_vi: 'Mặt trời và mặt trăng cùng soi sáng',
  components: null,
  stroke_paths: null,
  examples: null,
  related_vocab: null,
}

const baseCard: KanjiCardState = {
  userId: 'u1',
  char: '明',
  interval_days: 1,
  ease_factor: 2.5,
  due_date: '2026-04-26',
  review_count: 0,
  last_rating: null,
  pending_sync: false,
  updated_at: '2026-04-26T00:00:00Z',
  consecutive_correct: 0,
}

describe('kanjiFlipCard', () => {
  it('renders the character on the front face', () => {
    render(<KanjiFlipCard kanji={baseKanji} card={baseCard} onRate={vi.fn()} />)
    expect(screen.getAllByText('明').length).toBeGreaterThan(0)
  })

  it('does not show rating buttons before flip', () => {
    render(<KanjiFlipCard kanji={baseKanji} card={baseCard} onRate={vi.fn()} />)
    expect(screen.queryByText('Again')).toBeNull()
    expect(screen.queryByText('Good')).toBeNull()
  })

  it('shows rating buttons after clicking the card', async () => {
    const user = userEvent.setup()
    render(<KanjiFlipCard kanji={baseKanji} card={baseCard} onRate={vi.fn()} />)
    // Click the front face (first 明 occurrence)
    await user.click(screen.getAllByText('明')[0])
    expect(screen.getByText('Again')).toBeTruthy()
    expect(screen.getByText('Hard')).toBeTruthy()
    expect(screen.getByText('Good')).toBeTruthy()
    expect(screen.getByText('Easy')).toBeTruthy()
  })

  it('calls onRate with correct value when Good is clicked', async () => {
    const onRate = vi.fn()
    const user = userEvent.setup()
    render(<KanjiFlipCard kanji={baseKanji} card={baseCard} onRate={onRate} />)
    await user.click(screen.getAllByText('明')[0])
    await user.click(screen.getByText('Good'))
    expect(onRate).toHaveBeenCalledWith(2)
  })

  it('renders mnemonic when mnemonic_vi is present', async () => {
    const user = userEvent.setup()
    render(<KanjiFlipCard kanji={baseKanji} card={baseCard} onRate={vi.fn()} />)
    await user.click(screen.getAllByText('明')[0])
    expect(screen.getByText('Mặt trời và mặt trăng cùng soi sáng')).toBeTruthy()
  })

  it('does not render mnemonic section when mnemonic_vi is null', async () => {
    const user = userEvent.setup()
    const kanjiNoMnemonic = { ...baseKanji, mnemonic_vi: null }
    render(<KanjiFlipCard kanji={kanjiNoMnemonic} card={baseCard} onRate={vi.fn()} />)
    await user.click(screen.getAllByText('明')[0])
    expect(screen.queryByText('Mặt trời và mặt trăng cùng soi sáng')).toBeNull()
  })

  it('shows "—" when han_viet is null', async () => {
    const user = userEvent.setup()
    const kanjiNoHanViet = { ...baseKanji, han_viet: null }
    render(<KanjiFlipCard kanji={kanjiNoHanViet} card={baseCard} onRate={vi.fn()} />)
    await user.click(screen.getAllByText('明')[0])
    expect(screen.getByText('—')).toBeTruthy()
  })
})
