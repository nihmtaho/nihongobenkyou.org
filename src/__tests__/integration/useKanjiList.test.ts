import type { KanjiItem } from '../../types/kanji'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { useKanjiList } from '../../hooks/useKanjiList'

const TEST_USER = 'test-list-user'

const kanjiFixtures: KanjiItem[] = [
  { char: '木', jlpt_level: 'N5', lesson_number: 2, radical: '木', stroke_count: 4, onyomi: ['モク'], kunyomi: ['き'], meaning_en: ['tree'], meaning_vi: ['cây'], han_viet: 'Mộc', mnemonic_vi: null, components: null, stroke_paths: null, examples: null, related_vocab: null },
  { char: '林', jlpt_level: 'N5', lesson_number: 25, radical: '木', stroke_count: 8, onyomi: ['リン'], kunyomi: ['はやし'], meaning_en: ['forest'], meaning_vi: ['rừng'], han_viet: 'Lâm', mnemonic_vi: null, components: null, stroke_paths: null, examples: null, related_vocab: null },
  { char: '水', jlpt_level: 'N5', lesson_number: 1, radical: '水', stroke_count: 4, onyomi: ['スイ'], kunyomi: ['みず'], meaning_en: ['water'], meaning_vi: ['nước'], han_viet: 'Thuỷ', mnemonic_vi: null, components: null, stroke_paths: null, examples: null, related_vocab: null },
  { char: '火', jlpt_level: 'N5', lesson_number: 1, radical: '火', stroke_count: 4, onyomi: ['カ'], kunyomi: ['ひ'], meaning_en: ['fire'], meaning_vi: ['lửa'], han_viet: 'Hoả', mnemonic_vi: null, components: null, stroke_paths: null, examples: null, related_vocab: null },
  { char: '土', jlpt_level: 'N5', lesson_number: 2, radical: '土', stroke_count: 3, onyomi: ['ド', 'ト'], kunyomi: ['つち'], meaning_en: ['earth'], meaning_vi: ['đất'], han_viet: 'Thổ', mnemonic_vi: null, components: null, stroke_paths: null, examples: null, related_vocab: null },
]

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(async () => {
  await db.kanji.bulkPut(kanjiFixtures)
  await db.kanji_cards.clear()
})

afterEach(async () => {
  await db.kanji.clear()
  await db.kanji_cards.clear()
})

describe('useKanjiList', () => {
  it('returns all kanji without filters', async () => {
    const { result } = renderHook(() => useKanjiList(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(5)
  })

  it('filters by radical', async () => {
    const { result } = renderHook(() => useKanjiList(TEST_USER, { radical: '木' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map(k => k.char).sort()).toEqual(['木', '林'])
  })

  it('filters by stroke_count', async () => {
    const { result } = renderHook(() => useKanjiList(TEST_USER, { stroke_count: 4 }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const chars = result.current.data?.map(k => k.char) ?? []
    expect(chars).toContain('木')
    expect(chars).toContain('水')
    expect(chars).toContain('火')
    expect(chars).not.toContain('土')
  })

  it('merges kanji_cards for SRS badge data', async () => {
    await db.kanji_cards.put({
      userId: TEST_USER,
      char: '木',
      interval_days: 21,
      ease_factor: 2.5,
      due_date: '2026-04-26',
      review_count: 5,
      last_rating: 3,
      pending_sync: false,
      updated_at: '2026-04-26T00:00:00Z',
    })

    const { result } = renderHook(() => useKanjiList(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const mokItem = result.current.data?.find(k => k.char === '木')
    expect(mokItem?.card?.interval_days).toBe(21)
    const mizuItem = result.current.data?.find(k => k.char === '水')
    expect(mizuItem?.card).toBeUndefined()
  })
})
