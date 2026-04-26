import type { Passage } from '../../types/passages'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { usePassages } from '../../hooks/usePassages'

const testPassage: Passage = {
  passage_id: 'minna_shokyuu_1:3:0',
  book_source: 'minna_shokyuu_1',
  lesson_number: 3,
  text_ja: 'まいにちにほんごをべんきょうします。',
  text_vi: 'Tôi học tiếng Nhật mỗi ngày.',
  vocab_ids: ['mnn1_test001'],
  questions: [
    {
      question_vi: 'Người nói học gì?',
      options: ['にほんご', 'えいご'],
      correct_index: 0,
    },
    {
      question_vi: 'Người nói học mỗi khi nào?',
      options: ['まいにち', 'まいしゅう'],
      correct_index: 0,
    },
  ],
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('usePassages', () => {
  beforeEach(async () => {
    await db.passages.clear()
  })

  afterEach(async () => {
    await db.passages.clear()
  })

  it('returns empty array when no passages exist for the lesson', async () => {
    const { result } = renderHook(
      () => usePassages('minna_shokyuu_1', 3),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('returns passages seeded for the correct lesson', async () => {
    await db.passages.put(testPassage)

    const { result } = renderHook(
      () => usePassages('minna_shokyuu_1', 3),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].passage_id).toBe('minna_shokyuu_1:3:0')
  })

  it('does not return passages from a different lesson', async () => {
    await db.passages.put(testPassage)

    const { result } = renderHook(
      () => usePassages('minna_shokyuu_1', 5),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
