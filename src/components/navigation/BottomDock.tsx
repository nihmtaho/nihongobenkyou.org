import { Link, useRouterState } from '@tanstack/react-router'
import { BookOpen, BrainCircuit, Home, Languages, Layers } from 'lucide-react'
import { getNavConfig } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'HOME', Icon: Home, ariaLabel: 'Home' },
  { to: '/books', label: 'BOOKS', Icon: BookOpen, ariaLabel: 'Books' },
  { to: '/kanji', label: 'KANJI', Icon: Languages, ariaLabel: 'Kanji' },
  { to: '/study', label: 'STUDY', Icon: BrainCircuit, ariaLabel: 'Study' },
  { to: '/custom', label: 'MY DECKS', Icon: Layers, ariaLabel: 'My Decks' },
] as const

export function BottomDock() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const config = getNavConfig(pathname)

  if (config?.hideBottomBar || config?.hideNav)
    return null

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 lg:hidden z-50 bg-foreground"
      aria-label="Main navigation"
    >
      <div className="flex h-14 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ to, label, Icon, ariaLabel }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              aria-label={ariaLabel}
              className="flex flex-col items-center justify-center flex-1 gap-1 text-background"
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                className={cn(isActive ? 'opacity-100' : 'opacity-40')}
                aria-hidden
              />
              <span
                className={cn(
                  'font-[var(--br-mono-font)] text-[8px] uppercase',
                  isActive ? 'opacity-100' : 'opacity-40',
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  'size-1 bg-background',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
