import { useRouterState } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import * as React from 'react'

import { describe, expect, it, vi } from 'vitest'
import { BottomDock } from './BottomDock'

// NOTE: <a> without href has no "link" role in ARIA — map `to` → `href` so role queries work
function MockLink({ children, to, ...props }: React.ComponentProps<'a'> & { to?: string }) {
  return <a href={to} {...props}>{children}</a>
}

vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(),
  Link: MockLink,
}))

function setPathname(pathname: string) {
  vi.mocked(useRouterState).mockReturnValue({
    location: { pathname },
  } as ReturnType<typeof useRouterState>)
}

describe('bottomDock', () => {
  it('renders all 5 nav items', () => {
    setPathname('/')
    render(<BottomDock />)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /books/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /kanji/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /study/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /my decks/i })).toBeInTheDocument()
  })

  it('returns null on /settings (hideBottomBar)', () => {
    setPathname('/settings')
    const { container } = render(<BottomDock />)
    expect(container).toBeEmptyDOMElement()
  })

  it('returns null on /auth/login (hideNav)', () => {
    setPathname('/auth/login')
    const { container } = render(<BottomDock />)
    expect(container).toBeEmptyDOMElement()
  })
})
