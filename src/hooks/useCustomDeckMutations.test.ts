import 'fake-indexeddb/auto'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { db } from '../db/schema'
import { useCustomDeckMutations } from './useCustomDeckMutations'

const USER_ID = 'u1'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(async () => {
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
})

describe('useCustomDeckMutations', () => {
  it('createDeck adds deck to Dexie', async () => {
    const { result } = renderHook(() => useCustomDeckMutations(USER_ID), { wrapper: makeWrapper() })
    await result.current.createDeck.mutateAsync({ title: 'Test' })
    const decks = await db.custom_decks.where('user_id').equals(USER_ID).toArray()
    expect(decks).toHaveLength(1)
    expect(decks[0].title).toBe('Test')
  })

  it('deleteDeck removes deck from Dexie', async () => {
    const { result } = renderHook(() => useCustomDeckMutations(USER_ID), { wrapper: makeWrapper() })
    const d = await result.current.createDeck.mutateAsync({ title: 'ToDelete' })
    await result.current.deleteDeck.mutateAsync(d.id)
    expect(await db.custom_decks.get(d.id)).toBeUndefined()
  })

  it('toggleActive flips is_active', async () => {
    const { result } = renderHook(() => useCustomDeckMutations(USER_ID), { wrapper: makeWrapper() })
    const d = await result.current.createDeck.mutateAsync({ title: 'D' })
    await result.current.toggleActive.mutateAsync(d.id)
    expect((await db.custom_decks.get(d.id))?.is_active).toBe(true)
    await result.current.toggleActive.mutateAsync(d.id)
    expect((await db.custom_decks.get(d.id))?.is_active).toBe(false)
  })
})
