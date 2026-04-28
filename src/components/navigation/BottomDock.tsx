import { Link, useRouterState } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: 'HOME', icon: '⌂', ariaLabel: 'Home' },
  { to: '/books', label: 'BOOKS', icon: '◫', ariaLabel: 'Books' },
  { to: '/kanji', label: 'KANJI', icon: '字', ariaLabel: 'Kanji' },
  { to: '/srs', label: 'STUDY', icon: '◈', ariaLabel: 'Study' },
  { to: '/profile', label: 'PROFILE', icon: '◉', ariaLabel: 'Profile' },
] as const

export function BottomDock() {
  const { location } = useRouterState()
  const pathname = location.pathname

  return (
    <div className="dock lg:hidden">
      {NAV_ITEMS.map(({ to, label, icon, ariaLabel }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            aria-label={ariaLabel}
            className={isActive ? 'dock-active' : undefined}
          >
            <span>{icon}</span>
            <span className="dock-label font-[var(--br-mono-font)] text-[9px] uppercase">
              {label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
