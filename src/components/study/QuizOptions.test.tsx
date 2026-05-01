import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizOptions } from './QuizOptions'

const OPTIONS = [
  { id: 'a', label: 'ăn' },
  { id: 'b', label: 'uống' },
  { id: 'c', label: 'ngủ' },
  { id: 'd', label: 'chạy' },
]
const CORRECT_ID = 'a'

describe('quizOptions', () => {
  // shouldAdvanceTime keeps real time flowing so userEvent's internal awaits resolve normally.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 4 option buttons', () => {
    render(<QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={vi.fn()} />)
    expect(screen.getAllByRole('button').filter(b => OPTIONS.some(o => b.textContent?.includes(o.label)))).toHaveLength(4)
  })

  it('calls onAnswer(true) after 600ms when correct option clicked', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(<QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={onAnswer} />)

    await user.click(screen.getByText('ăn'))
    expect(onAnswer).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(600)
    expect(onAnswer).toHaveBeenCalledWith(true)
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  it('shows "TIẾP TỤC" button and calls onAnswer(false) when wrong option clicked', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(<QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={onAnswer} />)

    await user.click(screen.getByText('uống'))
    expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onAnswer).toHaveBeenCalledWith(false)
  })

  it('does not allow selecting a second option after first selection', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(<QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={onAnswer} />)

    await user.click(screen.getByText('uống'))
    await user.click(screen.getByText('ngủ'))
    await vi.advanceTimersByTimeAsync(600)
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it('selects correct option via keyboard key 1', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(<QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={onAnswer} />)

    await user.keyboard('1')
    await vi.advanceTimersByTimeAsync(600)
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('advances via Space key after wrong selection', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(<QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={onAnswer} />)

    await user.click(screen.getByText('uống'))
    await user.keyboard(' ')
    expect(onAnswer).toHaveBeenCalledWith(false)
  })

  it('resets state when options prop changes', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <QuizOptions options={OPTIONS} correctId={CORRECT_ID} onAnswer={onAnswer} />,
    )

    await user.click(screen.getByText('uống'))
    expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeInTheDocument()

    const newOptions = [
      { id: 'w', label: 'viết' },
      { id: 'x', label: 'đọc' },
      { id: 'y', label: 'nói' },
      { id: 'z', label: 'nghe' },
    ]
    rerender(<QuizOptions options={newOptions} correctId="w" onAnswer={onAnswer} />)
    expect(screen.queryByRole('button', { name: /tiếp tục/i })).not.toBeInTheDocument()
  })
})
