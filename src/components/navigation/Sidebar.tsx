import { Link, useRouterState } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/books', label: 'Books' },
  { to: '/srs', label: 'Study' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
] as const

export function Sidebar() {
  const { location } = useRouterState()
  const pathname = location.pathname

  return (
    <ul className="menu bg-base-100 border-r border-base-content/10 w-56 min-h-full p-2 hidden lg:block">
      {NAV_ITEMS.map(({ to, label }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
        return (
          <li key={to}>
            <Link
              to={to}
              className={
                isActive
                  ? 'border-l-4 border-primary bg-base-200 font-[var(--br-heading-font)]'
                  : 'font-[var(--br-heading-font)]'
              }
            >
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
