import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useVocabulary } from '../../hooks/useVocabulary'

function TestWrapper({ children }: { children: React.ReactNode }) {
  const client = React.useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    [],
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await db.vocabulary.bulkPut(sampleVocabulary)
})

afterEach(async () => {
  await db.delete()
})

describe('useVocabulary', () => {
  it('returns correct entries for a given book and lesson', async () => {
    const { result } = renderHook(
      () => useVocabulary('minna_shokyuu_1', 1),
      { wrapper: TestWrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const lesson1Items = sampleVocabulary.filter(v => v.lesson_number === 1)
    expect(result.current.data).toHaveLength(lesson1Items.length)
    expect(result.current.data?.every(v => v.lesson_number === 1)).toBe(true)
  })

  it('returns empty array when no entries match the lesson', async () => {
    const { result } = renderHook(
      () => useVocabulary('minna_shokyuu_1', 99),
      { wrapper: TestWrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('returns entries with correct vocab_ids computed from the real hash function', async () => {
    const { result } = renderHook(
      () => useVocabulary('minna_shokyuu_1', 2),
      { wrapper: TestWrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const lesson2Items = sampleVocabulary.filter(v => v.lesson_number === 2)
    const returnedIds = result.current.data?.map(v => v.vocab_id).sort()
    const expectedIds = lesson2Items.map(v => v.vocab_id).sort()
    expect(returnedIds).toEqual(expectedIds)
  })

  it('does not make any network requests', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useVocabulary('minna_shokyuu_1', 1),
      { wrapper: TestWrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSpy).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
