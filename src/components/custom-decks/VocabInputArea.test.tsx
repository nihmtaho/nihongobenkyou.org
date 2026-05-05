import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VocabInputArea } from './VocabInputArea'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  )
}

const mockOnSave = vi.fn().mockResolvedValue(undefined)

describe('vocabInputArea', () => {
  it('renders textarea and save button', () => {
    render(<VocabInputArea deckId="d1" userId="u1" onSave={mockOnSave} />, { wrapper })
    expect(screen.getByRole('textbox')).toBeTruthy()
    expect(screen.getByRole('button', { name: /lưu/i })).toBeTruthy()
  })

  it('shows parse preview count for valid JSON input', async () => {
    render(<VocabInputArea deckId="d1" userId="u1" onSave={mockOnSave} />, { wrapper })
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, {
      target: { value: JSON.stringify([{ kana: 'てすと', meaning_vi: 'test' }]) },
    })
    await waitFor(() => {
      expect(screen.getByText(/1 từ/)).toBeTruthy()
    })
  })

  it('shows error for invalid JSON', async () => {
    render(<VocabInputArea deckId="d1" userId="u1" onSave={mockOnSave} />, { wrapper })
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'not json' } })
    await waitFor(() => {
      expect(screen.getByText(/JSON/i)).toBeTruthy()
    })
  })

  it('calls onSave with parsed items on button click', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<VocabInputArea deckId="d1" userId="u1" onSave={onSave} />, { wrapper })
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, {
      target: { value: JSON.stringify([{ kana: 'てすと', meaning_vi: 'test' }]) },
    })
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ kana: 'てすと' })]),
        'json',
      )
    })
  })
})
