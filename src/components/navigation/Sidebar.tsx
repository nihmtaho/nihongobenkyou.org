import { Link, useRouterState } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import * as React from 'react'
import { useState } from 'react'

import { NAV_ITEMS } from '../../lib/nav.config'
import { useAuthStore } from '../../stores/authStore'

function SidebarNavItem({
  to,
  label,
  Icon,
  isActive,
  collapsed,
}: {
  to: string
  label: string
  Icon: React.ComponentType<{ 'size'?: number, 'className'?: string, 'strokeWidth'?: number, 'aria-hidden'?: boolean }>
  isActive: boolean
  collapsed: boolean
}) {
  if (collapsed) {
    return (
      <div className="tooltip tooltip-right" data-tip={label}>
        <Link
          to={to}
          aria-label={label}
          className={[
            'flex items-center justify-center w-full h-12 transition-colors',
            isActive
              ? 'border-l-4 border-primary bg-card'
              : 'border-l-4 border-transparent hover:bg-card',
          ].join(' ')}
        >
          <Icon
            size={17}
            className={isActive ? 'text-primary' : 'text-foreground/50'}
            strokeWidth={isActive ? 2.5 : 1.75}
            aria-hidden
          />
        </Link>
      </div>
    )
  }

  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-3 w-full px-4 h-11 transition-colors',
        isActive
          ? 'border-l-4 border-primary bg-card'
          : 'border-l-4 border-transparent hover:bg-card',
      ].join(' ')}
    >
      <Icon
        size={16}
        className={isActive ? 'text-primary' : 'text-foreground/50'}
        strokeWidth={isActive ? 2.5 : 1.75}
        aria-hidden
      />
      <span
        className={[
          'text-sm font-[var(--br-heading-font)] truncate',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </span>
    </Link>
  )
}

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  }
  catch {
    return false
  }
}

export function Sidebar() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const { displayName, email, avatarUrl, isAuthenticated } = useAuthStore()
  const isGuest = isAuthenticated && email === null
  const [imgFailed, setImgFailed] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed)

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar-collapsed', String(next))
      }
      catch {}
      return next
    })
  }

  const nameLabel = displayName ?? email?.split('@')[0] ?? 'Khách'

  // ── Collapsed user row ──
  const collapsedUserRow = isGuest
    ? (
        <div className="tooltip tooltip-right" data-tip="Đăng nhập">
          <Link
            to="/auth/login"
            aria-label="Đăng nhập"
            className="flex items-center justify-center h-12 w-full hover:bg-card transition-colors"
          >
            <User size={14} className="text-primary" />
          </Link>
        </div>
      )
    : (
        <div className="tooltip tooltip-right" data-tip={nameLabel}>
          <div className="avatar placeholder cursor-default flex items-center justify-center h-12 w-full">
            <div className="bg-secondary text-foreground w-8 h-8 border border-border/10 flex items-center justify-center">
              {avatarUrl && !imgFailed
                ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="object-cover w-full h-full"
                      onError={() => setImgFailed(true)}
                    />
                  )
                : <User size={14} className="text-foreground/50" />}
            </div>
          </div>
        </div>
      )

  // ── Expanded user row ──
  const expandedUserRow = isGuest
    ? (
        <div className="flex items-center gap-3 px-4 h-12 flex-shrink-0 border-b border-border/10">
          <div className="flex-none w-8 h-8 border border-dashed border-border/30 flex items-center justify-center">
            <User size={14} className="text-foreground/30" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground leading-none mb-1">
              Chưa đăng nhập
            </p>
            <Link
              to="/auth/login"
              className="text-[11px] font-[var(--br-mono-font)] uppercase text-primary hover:underline leading-none"
            >
              Đăng nhập →
            </Link>
          </div>
        </div>
      )
    : (
        <div className="flex items-center gap-3 px-4 h-12 flex-shrink-0 border-b border-border/10">
          <div className="avatar placeholder flex-none">
            <div className="bg-secondary text-foreground w-8 h-8 border border-border/10 flex items-center justify-center">
              {avatarUrl && !imgFailed
                ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="object-cover w-full h-full"
                      onError={() => setImgFailed(true)}
                    />
                  )
                : <User size={14} className="text-foreground/50" />}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground leading-none mb-0.5">
              Signed in
            </p>
            <p className="text-sm font-[var(--br-heading-font)] truncate leading-none">
              {nameLabel}
            </p>
          </div>
        </div>
      )

  return (
    <div
      className={[
        'hidden lg:flex lg:flex-col lg:h-screen lg:flex-shrink-0',
        'bg-background border-r border-border/10 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}
    >
      {/* Logo — h-12 matches DesktopTopBar */}
      <div className="flex items-center h-12 flex-shrink-0 border-b border-border/10 px-4 overflow-hidden">
        {collapsed
          ? (
              <span className="font-black font-[var(--br-heading-font)] tracking-tighter leading-none text-base">
                N.
              </span>
            )
          : (
              <span className="font-black font-[var(--br-heading-font)] tracking-tighter leading-none text-xl whitespace-nowrap">
                NIHONGO.
              </span>
            )}
      </div>

      {/* User row */}
      {collapsed
        ? (
            <div className="flex items-center justify-center h-12 flex-shrink-0 border-b border-border/10">
              {collapsedUserRow}
            </div>
          )
        : expandedUserRow}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto flex flex-col">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <SidebarNavItem
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              isActive={isActive}
              collapsed={collapsed}
            />
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={[
          'flex items-center w-full flex-shrink-0 border-t border-border/10',
          'text-foreground/40 hover:text-foreground/70 hover:bg-card transition-colors',
          collapsed ? 'justify-center h-12' : 'justify-between px-4 h-9',
        ].join(' ')}
      >
        {collapsed
          ? <ChevronRight size={15} />
          : (
              <>
                <span className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest">
                  Collapse
                </span>
                <ChevronLeft size={14} />
              </>
            )}
      </button>
    </div>
  )
}
