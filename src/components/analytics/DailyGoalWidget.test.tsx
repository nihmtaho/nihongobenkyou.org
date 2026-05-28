import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDailyGoal } from '../../hooks/useDailyGoal'
import { DailyGoalWidget } from './DailyGoalWidget'

vi.mock('../../hooks/useDailyGoal', () => ({
  useDailyGoal: vi.fn(),
}))
vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (s: { dailyReviewGoal: number, lastConfettiDate: string | null, setLastConfettiDate: (d: string | null) => void }) => unknown) =>
    selector({
      dailyReviewGoal: 20,
      lastConfettiDate: null,
      setLastConfettiDate: vi.fn(),
    }),
  ),
}))

const mockUseDailyGoal = vi.mocked(useDailyGoal)

const STREAK7_EMPTY: number[] = [0, 0, 0, 0, 0, 0, 0]
const STREAK7_FULL: number[] = [20, 20, 20, 20, 20, 20, 20]

describe('dailyGoalWidget', () => {
  it('renders loading skeleton while data is null and isLoading', () => {
    mockUseDailyGoal.mockReturnValue({ data: null, isLoading: true })
    const { container } = render(<DailyGoalWidget userId="u1" />)
    expect(container.querySelector('[data-testid="daily-goal-skeleton"]')).not.toBeNull()
  })

  it('shows count/goal label', () => {
    mockUseDailyGoal.mockReturnValue({
      data: { todayCount: 7, goal: 20, isComplete: false, streak7: STREAK7_EMPTY },
      isLoading: false,
    })
    render(<DailyGoalWidget userId="u1" />)
    expect(screen.getByText('7/20')).toBeInTheDocument()
  })

  it('shows completion message when goal is reached', () => {
    mockUseDailyGoal.mockReturnValue({
      data: { todayCount: 20, goal: 20, isComplete: true, streak7: STREAK7_FULL },
      isLoading: false,
    })
    render(<DailyGoalWidget userId="u1" />)
    expect(screen.getByText('🎉 Hoàn thành hôm nay!')).toBeInTheDocument()
  })

  it('renders 7 history bars', () => {
    mockUseDailyGoal.mockReturnValue({
      data: { todayCount: 5, goal: 20, isComplete: false, streak7: STREAK7_EMPTY },
      isLoading: false,
    })
    render(<DailyGoalWidget userId="u1" />)
    expect(screen.getAllByTestId('history-bar')).toHaveLength(7)
  })
})
