import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/books', label: 'Books' },
  { to: '/kanji', label: 'Kanji' },
  { to: '/srs', label: 'Study' },
  { to: '/custom', label: 'My Decks' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
] as const

export function Sidebar() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const { displayName, email, avatarUrl } = useAuthStore()
  const [imgFailed, setImgFailed] = useState(false)

  const nameLabel = displayName ?? email?.split('@')[0] ?? 'Guest'
  const initials = nameLabel.slice(0, 2).toUpperCase()

  return (
    <ul className="menu bg-base-100 border-r border-base-content/10 w-56 min-h-full p-2 hidden lg:flex lg:flex-col lg:h-screen lg:overflow-y-auto lg:flex-shrink-0">
      <li className="mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-base-300 text-base-content w-8 h-8 border border-base-content/10">
              {avatarUrl && !imgFailed
                ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="object-cover w-full h-full"
                      onError={() => setImgFailed(true)}
                    />
                  )
                : <span className="text-xs font-[var(--br-heading-font)]">{initials}</span>}
            </div>
          </div>
          <span className="text-sm font-[var(--br-heading-font)] truncate">{nameLabel}</span>
        </div>
      </li>

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
