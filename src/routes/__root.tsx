import { useQueryClient } from '@tanstack/react-query'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { OfflineAuthNotice } from '../components/auth/OfflineAuthNotice'
import { ReactivationBanner } from '../components/auth/ReactivationBanner'
import { BottomDock } from '../components/navigation/BottomDock'
import { MobileTopNav } from '../components/navigation/MobileTopNav'
import { Sidebar } from '../components/navigation/Sidebar'
import { OfflineIndicator } from '../components/offline/OfflineIndicator'
import { UpdateProgressModal } from '../components/update/UpdateProgressModal'
import { useAuth } from '../hooks/useAuth'
import { getNavConfig, usesDesktopStyleTopBar } from '../lib/nav-config'
import { cn } from '../lib/utils'
import { useSettingsStore } from '../stores/settingsStore'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/books': 'Books',
  '/study': 'Study',
  '/custom': 'My Decks',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/kanji': 'Kanji',
  '/stats': 'Statistics',
  '/leaderboard': 'Leaderboard',
}

function DesktopTopBar({ showOnMobile = false }: { showOnMobile?: boolean }) {
  const { location } = useRouterState()
  const pathname = location.pathname
  const activeTheme = useSettingsStore(s => s.activeTheme)

  const datasetBadge = activeTheme
    .replace('brutalist-', '')
    .replace('-dark', '')
    .toUpperCase()

  const title = Object.entries(ROUTE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1]
    ?? ''

  return (
    <div
      className={cn(
        'items-center justify-between border-b border-border/10 bg-background flex-shrink-0 h-12',
        showOnMobile ? 'flex px-4 lg:px-6' : 'hidden lg:flex px-6',
      )}
    >
      <span className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
        {title}
      </span>
      <span className="inline-block text-[10px] font-[var(--br-mono-font)] bg-primary text-primary-foreground px-2 py-0.5">
        #
        {datasetBadge}
      </span>
    </div>
  )
}

function RootLayout() {
  const { location } = useRouterState()
  const activeTheme = useSettingsStore(s => s.activeTheme)
  const fontSize = useSettingsStore(s => s.fontSize)
  const queryClient = useQueryClient()
  const showDesktopLikeTopBar = usesDesktopStyleTopBar(location.pathname)
  const hideNav = getNavConfig(location.pathname)?.hideNav ?? false

  useAuth()

  useEffect(() => {
    function handleKanjiSeeded() {
      queryClient.invalidateQueries({ queryKey: ['kanji-list'] })
      queryClient.invalidateQueries({ queryKey: ['kanji'] })
    }
    window.addEventListener('kanji-seeded', handleKanjiSeeded)
    return () => window.removeEventListener('kanji-seeded', handleKanjiSeeded)
  }, [queryClient])

  // Apply synchronously before paint — same pattern as theme to avoid FOUC
  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'vi'
    document.documentElement.dataset.theme = activeTheme
    const html = document.documentElement
    html.classList.remove('text-sm', 'text-lg')
    if (fontSize === 'sm')
      html.classList.add('text-sm')
    else if (fontSize === 'lg')
      html.classList.add('text-lg')
  }

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-sm', 'text-lg')
    if (fontSize === 'sm')
      html.classList.add('text-sm')
    else if (fontSize === 'lg')
      html.classList.add('text-lg')
  }, [fontSize])

  // Auth/callback pages — full-screen, no chrome
  if (hideNav) {
    return (
      <>
        <UpdateProgressModal />
        <Outlet />
      </>
    )
  }

  return (
    <>
      <UpdateProgressModal />
      <OfflineAuthNotice />
      <ReactivationBanner />
      <OfflineIndicator />
      <div className="flex h-dvh min-h-0 lg:overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 lg:overflow-hidden">
          <DesktopTopBar showOnMobile={showDesktopLikeTopBar} />
          <main
            className={cn(
              'flex-1 pb-24 lg:pb-0 lg:overflow-y-auto min-h-0',
              showDesktopLikeTopBar ? 'pt-0' : 'pt-11',
              'lg:pt-0',
            )}
          >
            <Outlet />
          </main>
        </div>
        <MobileTopNav />
        <BottomDock />
      </div>
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
