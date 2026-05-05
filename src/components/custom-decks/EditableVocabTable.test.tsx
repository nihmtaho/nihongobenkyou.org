import type { CustomVocabItem } from '../../types/custom-deck'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditableVocabTable } from './EditableVocabTable'

const WORDS: CustomVocabItem[] = [
  {
    id: 'w1',
    deck_id: 'd1',
    user_id: 'u1',
    kana: 'かいぎ',
    kanji: '会議',
    han_viet: 'hội nghị',
    meaning_vi: 'cuộc họp',
    source: 'json',
    created_at: '2024-01-01',
  },
]

describe('editableVocabTable', () => {
  it('renders word rows', () => {
    render(
      <EditableVocabTable
        words={WORDS}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('会議')).toBeTruthy()
    expect(screen.getByText('かいぎ')).toBeTruthy()
  })

  it('enters edit mode when a cell is clicked', () => {
    render(
      <EditableVocabTable
        words={WORDS}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('会議'))
    expect(screen.getByDisplayValue('会議')).toBeTruthy()
  })

  it('calls onUpdate with new values when ✓ is clicked', () => {
    const onUpdate = vi.fn()
    render(
      <EditableVocabTable
        words={WORDS}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('会議'))
    const input = screen.getByDisplayValue('会議')
    fireEvent.change(input, { target: { value: '会社' } })
    fireEvent.click(screen.getByRole('button', { name: '✓' }))
    expect(onUpdate).toHaveBeenCalledWith('w1', expect.objectContaining({ kanji: '会社' }))
  })

  it('calls onDelete when ✕ is clicked', () => {
    const onDelete = vi.fn()
    render(
      <EditableVocabTable
        words={WORDS}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    )
    fireEvent.click(screen.getByText('会議'))
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onDelete).toHaveBeenCalledWith('w1')
  })
})
