import type { UnifiedDueStats } from '../../../../hooks/useUnifiedDueStats'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VocabStudyTab } from '../VocabStudyTab'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  // NOTE: ESLint requires module-level component definitions, so we return a plain render fn
  Link: vi.fn(({ children, className }: { children: React.ReactNode, className?: string }) =>
    createElement('a', { className }, children)),
}))

vi.mock('../../../analytics/ReviewActivityWidget', () => ({
  ReviewActivityWidget: vi.fn(() => null),
}))

function makeStats(overrides: Partial<UnifiedDueStats> = {}): UnifiedDueStats {
  return {
    dueToday: 0,
    dueLaterToday: 0,
    dueTomorrow: 0,
    dueThisWeek: 0,
    due21Days: 0,
    vocabDue: 0,
    kanjiDue: 0,
    kanjiVocabDue: 0,
    learning: 0,
    review: 0,
    mature: 0,
    vocabLearning: 0,
    vocabReview: 0,
    vocabMature: 0,
    kanjiLearning: 0,
    kanjiReview: 0,
    kanjiMature: 0,
    customDecksLearning: 0,
    customDecksReview: 0,
    customDecksMature: 0,
    vocabDueTomorrow: 0,
    vocabDueThisWeek: 0,
    vocabDue21Days: 0,
    kanjiDueTomorrow: 0,
    kanjiDueThisWeek: 0,
    kanjiDue21Days: 0,
    nextDueLaterTodayMs: null,
    nextDueTomorrowMs: null,
    nextDueThisWeekMs: null,
    nextDue21DaysMs: null,
    customDecksDueToday: 0,
    customDecksDueTomorrow: 0,
    customDecksDueThisWeek: 0,
    customDecksDue21Days: 0,
    ...overrides,
  }
}

function renderWithQuery(component: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    createElement(QueryClientProvider, { client: queryClient }, component),
  )
}

describe('vocabStudyTab', () => {
  it('cta button is disabled when vocabDue is 0', () => {
    renderWithQuery(<VocabStudyTab userId="u1" stats={makeStats({ vocabDue: 0 })} />)
    expect(screen.getByRole('button', { name: /ĐÃ ÔN TẬP XONG/ })).toBeDisabled()
  })

  it('cta button shows due count and is enabled when vocabDue > 0', () => {
    renderWithQuery(<VocabStudyTab userId="u1" stats={makeStats({ vocabDue: 5 })} />)
    const btn = screen.getByRole('button', { name: /ÔN TẬP TỪ VỰNG/ })
    expect(btn).toBeEnabled()
    expect(btn.textContent).toContain('5')
  })

  it('upcoming rows only render when count > 0', () => {
    renderWithQuery(
      <VocabStudyTab
        userId="u1"
        stats={makeStats({ vocabDueTomorrow: 3, vocabDueThisWeek: 0, vocabDue21Days: 0 })}
      />,
    )
    expect(screen.getByText('Ngày mai')).toBeInTheDocument()
    expect(screen.queryByText('Tuần này')).not.toBeInTheDocument()
  })
})
