import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StudyGoalSection } from './StudyGoalSection'

const mockSetDailyReviewGoal = vi.fn()

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (s: { dailyReviewGoal: number, setDailyReviewGoal: (n: number) => void }) => unknown) =>
    selector({
      dailyReviewGoal: 20,
      setDailyReviewGoal: mockSetDailyReviewGoal,
    }),
  ),
}))

beforeEach(() => {
  mockSetDailyReviewGoal.mockClear()
})

describe('studyGoalSection', () => {
  it('renders the section heading', () => {
    render(<StudyGoalSection />)
    expect(screen.getByText('MỤC TIÊU HỌC TẬP')).toBeInTheDocument()
  })

  it('renders all preset buttons', () => {
    render(<StudyGoalSection />)
    for (const preset of [5, 10, 15, 20, 30, 50, 100]) {
      expect(screen.getByRole('button', { name: String(preset) })).toBeInTheDocument()
    }
  })

  it('highlights the active preset (20 by default)', () => {
    render(<StudyGoalSection />)
    const btn20 = screen.getByRole('button', { name: '20' })
    expect(btn20.className).toMatch(/destructive|active/)
  })

  it('calls setDailyReviewGoal when a preset is clicked', () => {
    render(<StudyGoalSection />)
    fireEvent.click(screen.getByRole('button', { name: '30' }))
    expect(mockSetDailyReviewGoal).toHaveBeenCalledWith(30)
  })

  it('calls setDailyReviewGoal with clamped value from custom input', () => {
    render(<StudyGoalSection />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '250' } })
    fireEvent.blur(input)
    expect(mockSetDailyReviewGoal).toHaveBeenCalledWith(200) // clamped to max
  })

  it('calls setDailyReviewGoal with min value when below range', () => {
    render(<StudyGoalSection />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.blur(input)
    expect(mockSetDailyReviewGoal).toHaveBeenCalledWith(5) // clamped to min
  })
})
