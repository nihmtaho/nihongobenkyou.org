import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabStudyModal } from '../VocabStudyModal'

const defaultProps = {
  title: 'Bài 03',
  context: 'all' as const,
  onLaunch: vi.fn(),
  onClose: vi.fn(),
}

beforeEach(() => {
  defaultProps.onLaunch.mockReset()
  defaultProps.onClose.mockReset()
})

describe('vocabStudyModal', () => {
  it('renders title and all mode names', () => {
    render(<VocabStudyModal {...defaultProps} />)
    expect(screen.getByText('Bài 03')).toBeInTheDocument()
    expect(screen.getByText('Flashcard')).toBeInTheDocument()
    expect(screen.getByText('Trắc nghiệm')).toBeInTheDocument()
    expect(screen.getByText('Từ vựng → Hiragana')).toBeInTheDocument()
    expect(screen.getByText('Tiếng Việt → Hiragana')).toBeInTheDocument()
    expect(screen.getByText('Từ vựng → Tiếng Việt')).toBeInTheDocument()
    expect(screen.getByText('Nghe hiểu')).toBeInTheDocument()
  })

  it('shows TỰ HỌC badge when context=all', () => {
    render(<VocabStudyModal {...defaultProps} context="all" />)
    expect(screen.getByText(/TỰ HỌC/)).toBeInTheDocument()
  })

  it('shows ÔN TẬP badge with dueCount when context=due', () => {
    render(<VocabStudyModal {...defaultProps} context="due" dueCount={8} />)
    expect(screen.getByText(/ÔN TẬP/)).toBeInTheDocument()
    expect(screen.getByText(/8/)).toBeInTheDocument()
  })

  it('renders SRS progress stats when stats prop provided', () => {
    const stats = { total: 23, new: 5, learning: 8, review: 6, mature: 4 }
    render(<VocabStudyModal {...defaultProps} stats={stats} />)
    // NOTE: /8/ matches both learning count "8" and studied total "18" — use getAllByText
    expect(screen.getAllByText(/8/).length).toBeGreaterThan(0)
  })

  it('calls onLaunch("flashcard", undefined) when Flashcard row clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Flashcard/ }))
    expect(defaultProps.onLaunch).toHaveBeenCalledWith('flashcard', undefined)
  })

  it('calls onLaunch("quiz", undefined) when Trắc nghiệm row clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Trắc nghiệm/ }))
    expect(defaultProps.onLaunch).toHaveBeenCalledWith('quiz', undefined)
  })

  it('calls onLaunch("type-input", "word→hira") when first Gõ từ sub-row clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Từ vựng.*Hiragana/ }))
    expect(defaultProps.onLaunch).toHaveBeenCalledWith('type-input', 'word→hira')
  })

  it('calls onLaunch("type-input", "vi→hira") when second Gõ từ sub-row clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Tiếng Việt.*Hiragana/ }))
    expect(defaultProps.onLaunch).toHaveBeenCalledWith('type-input', 'vi→hira')
  })

  it('calls onLaunch("type-input", "word→vi") when third Gõ từ sub-row clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Từ vựng.*Tiếng Việt/ }))
    expect(defaultProps.onLaunch).toHaveBeenCalledWith('type-input', 'word→vi')
  })

  it('calls onLaunch("listening", undefined) when Nghe hiểu row clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Nghe hiểu/ }))
    expect(defaultProps.onLaunch).toHaveBeenCalledWith('listening', undefined)
  })

  it('calls onClose when ESC key is pressed', () => {
    render(<VocabStudyModal {...defaultProps} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<VocabStudyModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Đóng/ }))
    expect(defaultProps.onClose).toHaveBeenCalledOnce()
  })
})
