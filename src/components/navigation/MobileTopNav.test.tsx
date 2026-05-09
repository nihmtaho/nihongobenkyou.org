import { useRouterState } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'

import { describe, expect, it, vi } from 'vitest'
import { MobileTopNav } from './MobileTopNav'

const mockNavigate = vi.fn()
const mockBack = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(),
  useRouter: vi.fn(() => ({ navigate: mockNavigate, history: { back: mockBack } })),
}))

vi.mock('@/hooks/useScrollDirection', () => ({
  useScrollDirection: vi.fn(() => 'top' as const),
}))

// Mock child components that require their own setup
vi.mock('./BookInfoSheet', () => ({
  BookInfoSheet: () => null,
}))

vi.mock('./FloatingBackButton', () => ({
  FloatingBackButton: () => null,
}))

function setPathname(pathname: string) {
  vi.mocked(useRouterState).mockReturnValue({
    location: { pathname },
  } as ReturnType<typeof useRouterState>)
}

describe('mobileTopNav', () => {
  it('renders title on route with back button', () => {
    setPathname('/kanji/graph')
    render(<MobileTopNav />)
    expect(screen.getByText('KANJI GRAPH')).toBeInTheDocument()
  })

  it('renders back button on /books/mnn1', () => {
    setPathname('/books/mnn1')
    render(<MobileTopNav />)
    expect(screen.getByRole('button', { name: /back to books/i })).toBeInTheDocument()
  })

  it('does not render on auth routes', () => {
    setPathname('/auth/login')
    const { container } = render(<MobileTopNav />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows info icon on /books/mnn1', () => {
    setPathname('/books/mnn1')
    render(<MobileTopNav />)
    expect(screen.getByRole('button', { name: /book info/i })).toBeInTheDocument()
  })

  it('does not show info icon on /books', () => {
    setPathname('/books')
    render(<MobileTopNav />)
    expect(screen.queryByRole('button', { name: /book info/i })).not.toBeInTheDocument()
  })
})
