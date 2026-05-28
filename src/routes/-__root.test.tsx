import type { QueryClient } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Route } from './__root'

function MockOutlet() {
  return <div>outlet</div>
}

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: MockOutlet,
  createRootRoute: (options: unknown) => ({ options }),
  useRouterState: vi.fn(),
}))

vi.mock('../components/auth/OfflineAuthNotice', () => ({
  OfflineAuthNotice: () => null,
}))

vi.mock('../components/auth/ReactivationBanner', () => ({
  ReactivationBanner: () => null,
}))

vi.mock('../components/navigation/BottomDock', () => ({
  BottomDock: () => null,
}))

vi.mock('../components/navigation/MobileTopNav', () => ({
  MobileTopNav: () => null,
}))

vi.mock('../components/navigation/Sidebar', () => ({
  Sidebar: () => null,
}))

vi.mock('../components/offline/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}))

vi.mock('../components/update/UpdateProgressModal', () => ({
  UpdateProgressModal: () => null,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../lib/nav-config', () => ({
  usesDesktopStyleTopBar: vi.fn(() => false),
  getNavConfig: vi.fn(() => ({ hideNav: false })),
}))

vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (state: { activeTheme: string, fontSize: string }) => unknown) =>
    selector({ activeTheme: 'brutalist-minna', fontSize: 'md' })),
}))

describe('root layout mobile spacing', () => {
  it('uses standard mobile bottom padding instead of global dock clearance', () => {
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as unknown as QueryClient)
    vi.mocked(useRouterState).mockReturnValue({
      location: { pathname: '/books' },
    } as ReturnType<typeof useRouterState>)

    const RootComponent = Route.options.component as ComponentType
    const { container } = render(<RootComponent />)

    const main = container.querySelector('main')
    expect(main?.className).toContain('pb-24')
    expect(main?.className).not.toContain('pb-[calc(env(safe-area-inset-bottom)+6rem)]')
  })
})
