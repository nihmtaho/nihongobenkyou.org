import type * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement, useMemo } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/schema'

import { AddToDeckDialog } from './AddToDeckDialog'
import 'fake-indexeddb/auto'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const USER_ID = 'u-dialog-test'
const SAMPLE_VOCAB = {
  vocab_id: 'v1',
  word: '食べる',
  reading: 'たべる',
  meaning_vi: 'ăn',
  han_viet: null,
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } }),
    [],
  )
  return createElement(QueryClientProvider, { client: qc }, children)
}

function renderDialog(props: { open?: boolean } = {}) {
  const onOpenChange = vi.fn()
  render(
    createElement(Wrapper, null, createElement(AddToDeckDialog, {
      open: props.open ?? true,
      onOpenChange,
      vocabItem: SAMPLE_VOCAB,
      userId: USER_ID,
    })),
  )
  return { onOpenChange }
}

beforeEach(async () => {
  await db.custom_decks.clear()
  await db.custom_vocabulary.clear()
  vi.clearAllMocks()
})

describe('addToDeckDialog', () => {
  it('renders deck list as checkboxes', async () => {
    await db.custom_decks.bulkAdd([
      { id: 'd1', user_id: USER_ID, title: 'JLPT N5', description: null, is_active: false, word_count: 3, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'd2', user_id: USER_ID, title: 'Từ khó', description: null, is_active: false, word_count: 7, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ])
    renderDialog()
    await screen.findByText('JLPT N5')
    expect(screen.getByText('Từ khó')).toBeInTheDocument()
  })

  it('confirm button is disabled when no deck selected', async () => {
    await db.custom_decks.add({ id: 'd1', user_id: USER_ID, title: 'D', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })
    renderDialog()
    await screen.findByText('D')
    expect(screen.getByRole('button', { name: /xác nhận/i })).toBeDisabled()
  })

  it('confirm button enabled after selecting a deck', async () => {
    await db.custom_decks.add({ id: 'd1', user_id: USER_ID, title: 'Deck A', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })
    renderDialog()
    await screen.findByText('Deck A')
    await userEvent.click(screen.getByRole('checkbox', { name: /deck a/i }))
    expect(screen.getByRole('button', { name: /xác nhận/i })).not.toBeDisabled()
  })

  it('adds vocab to selected decks and closes on confirm', async () => {
    await db.custom_decks.add({ id: 'd1', user_id: USER_ID, title: 'N5', description: null, is_active: false, word_count: 0, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })
    const { onOpenChange } = renderDialog()
    await screen.findByText('N5')
    await userEvent.click(screen.getByRole('checkbox', { name: /n5/i }))
    await userEvent.click(screen.getByRole('button', { name: /xác nhận/i }))

    await waitFor(async () => {
      const words = await db.custom_vocabulary.toArray()
      expect(words).toHaveLength(1)
      expect(words[0].kana).toBe('たべる')
      expect(words[0].kanji).toBe('食べる')
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('shows empty state with create form when no decks', async () => {
    renderDialog()
    await waitFor(() => {
      expect(screen.getByText(/chưa có deck nào/i)).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText(/tên deck/i)).toBeInTheDocument()
  })

  it('creates new deck and auto-selects it', async () => {
    renderDialog()
    await waitFor(() => screen.getByPlaceholderText(/tên deck/i))
    const titleInput = screen.getByPlaceholderText(/tên deck/i)
    await userEvent.type(titleInput, 'Brand New Deck')
    await userEvent.click(screen.getByRole('button', { name: /tạo/i }))

    await waitFor(async () => {
      const decks = await db.custom_decks.toArray()
      expect(decks).toHaveLength(1)
      expect(decks[0].title).toBe('Brand New Deck')
    })
    // New deck auto-selected — confirm button enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /xác nhận/i })).not.toBeDisabled()
    })
  })
})
