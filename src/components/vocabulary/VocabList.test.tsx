import type { VocabItem } from '../../types/vocabulary'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VocabList } from './VocabList'

const { mockUseVirtualizer } = vi.hoisted(() => ({
  mockUseVirtualizer: vi.fn(() => ({
    getVirtualItems: () => [{ index: 0, key: 'row-0', start: 0 }],
    getTotalSize: () => 180,
    measureElement: vi.fn(),
  })),
}))

function MockVocabCard({ item }: { item: VocabItem }) {
  return <div>{item.word}</div>
}

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: mockUseVirtualizer,
}))

vi.mock('./VocabCard', () => ({
  VocabCard: MockVocabCard,
}))

vi.mock('./HiddenVocabList', () => ({
  HiddenVocabList: () => null,
}))

vi.mock('./VocabDetailPanel', () => ({
  VocabDetailPanel: () => null,
}))

vi.mock('./VocabIndexRow', () => ({
  VocabIndexRow: () => null,
}))

const ITEM: VocabItem = {
  vocab_id: 'v1',
  word: '食べる',
  reading: 'たべる',
  romaji: 'taberu',
  meaning_en: 'to eat',
  meaning_vi: 'ăn',
  pitch_pattern: null,
  pitch_type: null,
  audio_filename: null,
  pos: ['verb'],
  jlpt_level: 5,
  book_source: 'minna_shokyuu_1',
  lesson_number: 1,
  examples: [],
  tags: [],
  deprecated: false,
}

describe('vocabList mobile layout', () => {
  it('uses parent height and bottom clearance instead of hardcoded viewport height', () => {
    const { container } = render(
      <VocabList
        items={[ITEM]}
        cards={new Map()}
        userId="u1"
        isLoading={false}
      />,
    )

    expect(screen.getByText('食べる')).toBeInTheDocument()

    const mobileScroller = container.querySelector('.lg\\:hidden')
    expect(mobileScroller?.className).toContain('h-full')
    expect(mobileScroller?.className).toContain('min-h-0')
    expect(mobileScroller?.className).not.toContain('flex-1')
    expect(mobileScroller?.className).not.toContain('h-[calc(100vh-4rem)]')

    const spacer = mobileScroller?.firstElementChild as HTMLDivElement | null
    expect(spacer?.className).toContain('pb-[calc(env(safe-area-inset-bottom)+5.5rem)]')
  })
})
