import { Link, useRouterState } from '@tanstack/react-router'
import { BookOpen, BrainCircuit, Home, Languages, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'HOME', Icon: Home, ariaLabel: 'Home' },
  { to: '/books', label: 'BOOKS', Icon: BookOpen, ariaLabel: 'Books' },
  { to: '/kanji', label: 'KANJI', Icon: Languages, ariaLabel: 'Kanji' },
  { to: '/study', label: 'STUDY', Icon: BrainCircuit, ariaLabel: 'Study' },
  { to: '/settings', label: 'SETTINGS', Icon: Settings, ariaLabel: 'Settings' },
] as const

export function BottomDock() {
  const { location } = useRouterState()
  const pathname = location.pathname

  return (
    <div className="dock lg:hidden">
      {NAV_ITEMS.map(({ to, label, Icon, ariaLabel }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            aria-label={ariaLabel}
            className={isActive ? 'dock-active' : undefined}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden />
            <span className="dock-label font-[var(--br-mono-font)] text-[9px] uppercase">
              {label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
