import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BookInfoSheet } from './BookInfoSheet'

describe('bookInfoSheet', () => {
  it('shows book title when open', () => {
    render(<BookInfoSheet open bookPrefix="mnn1" onOpenChange={() => {}} />)
    expect(screen.getByText('MINNA NO NIHONGO SHOKYUU I')).toBeInTheDocument()
  })

  it('shows JLPT level badge', () => {
    render(<BookInfoSheet open bookPrefix="mnn1" onOpenChange={() => {}} />)
    expect(screen.getByText('N5')).toBeInTheDocument()
  })

  it('shows lesson range badge', () => {
    render(<BookInfoSheet open bookPrefix="mnn1" onOpenChange={() => {}} />)
    expect(screen.getByText('L1–25')).toBeInTheDocument()
  })

  it('renders no book content for unknown bookPrefix', () => {
    render(<BookInfoSheet open bookPrefix="unknown" onOpenChange={() => {}} />)
    expect(screen.queryByText(/N5/)).not.toBeInTheDocument()
  })
})
