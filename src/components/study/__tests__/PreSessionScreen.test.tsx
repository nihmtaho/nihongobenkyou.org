import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreSessionScreen } from '../PreSessionScreen'

const defaultProps = {
  filter: 'vocab' as const,
  vocabCount: 5,
  kanjiCount: 0,
  kanjiVocabCount: 0,
  mode: 'flashcard' as const,
  typeInputSubMode: 'word→hira' as const,
  onSetMode: vi.fn(),
  onSetTypeInputSubMode: vi.fn(),
  onStart: vi.fn(),
  onBack: vi.fn(),
}

describe('preSessionScreen sub-mode selector', () => {
  it('does not show sub-mode selector when mode is not type-input', () => {
    render(<PreSessionScreen {...defaultProps} mode="flashcard" />)
    expect(screen.queryByText(/TUỲ CHỌN GÕ TỪ/i)).not.toBeInTheDocument()
  })

  it('shows sub-mode selector when mode is type-input', () => {
    render(<PreSessionScreen {...defaultProps} mode="type-input" />)
    expect(screen.getByText(/TUỲ CHỌN GÕ TỪ/i)).toBeInTheDocument()
  })

  it('renders all three sub-mode options', () => {
    render(<PreSessionScreen {...defaultProps} mode="type-input" />)
    expect(screen.getByText(/TỪ VỰNG → CÁCH ĐỌC/i)).toBeInTheDocument()
    expect(screen.getByText(/TIẾNG VIỆT → CÁCH ĐỌC/i)).toBeInTheDocument()
    expect(screen.getByText(/TỪ VỰNG → NGHĨA VIỆT/i)).toBeInTheDocument()
  })

  it('highlights the active sub-mode', () => {
    render(<PreSessionScreen {...defaultProps} mode="type-input" typeInputSubMode="vi→hira" />)
    const activeBtn = screen.getByText(/TIẾNG VIỆT → CÁCH ĐỌC/i)
    expect(activeBtn.className).toMatch(/bg-primary/)
  })

  it('calls onSetTypeInputSubMode when a sub-mode button is clicked', () => {
    const onSetTypeInputSubMode = vi.fn()
    render(
      <PreSessionScreen
        {...defaultProps}
        mode="type-input"
        onSetTypeInputSubMode={onSetTypeInputSubMode}
      />,
    )
    fireEvent.click(screen.getByText(/TỪ VỰNG → NGHĨA VIỆT/i))
    expect(onSetTypeInputSubMode).toHaveBeenCalledWith('word→vi')
  })

  it('hides sub-mode selector when switching from type-input to another mode', () => {
    const { rerender } = render(<PreSessionScreen {...defaultProps} mode="type-input" />)
    expect(screen.getByText(/TUỲ CHỌN GÕ TỪ/i)).toBeInTheDocument()

    rerender(<PreSessionScreen {...defaultProps} mode="quiz" />)
    expect(screen.queryByText(/TUỲ CHỌN GÕ TỪ/i)).not.toBeInTheDocument()
  })
})
