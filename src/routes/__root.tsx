import { useQueryClient } from '@tanstack/react-query'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { OfflineAuthNotice } from '../components/auth/OfflineAuthNotice'
import { ReactivationBanner } from '../components/auth/ReactivationBanner'
import { BottomDock } from '../components/navigation/BottomDock'
import { Sidebar } from '../components/navigation/Sidebar'
import { OfflineIndicator } from '../components/offline/OfflineIndicator'
import { useAuth } from '../hooks/useAuth'
import { useSettingsStore } from '../stores/settingsStore'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/books': 'Books',
  '/srs': 'Study',
  '/custom': 'My Decks',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/kanji': 'Kanji',
  '/kanji/review': 'Kanji Review',
  '/stats': 'Statistics',
  '/leaderboard': 'Leaderboard',
}

function DesktopTopBar() {
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
    <div className="hidden lg:flex items-center justify-between px-6 border-b border-base-content/10 bg-base-100 flex-shrink-0 h-12">
      <span className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
        {title}
      </span>
      <span className="badge badge-primary font-[var(--br-mono-font)] text-[10px]">
        #
        {datasetBadge}
      </span>
    </div>
  )
}

function RootLayout() {
  const activeTheme = useSettingsStore(s => s.activeTheme)
  const fontSize = useSettingsStore(s => s.fontSize)
  const [datasetUpdated, setDatasetUpdated] = useState(false)
  const queryClient = useQueryClient()

  useAuth()

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | undefined
    function handleDatasetUpdated() {
      setDatasetUpdated(true)
      dismissTimer = setTimeout(setDatasetUpdated, 5000, false)
    }
    window.addEventListener('dataset-updated', handleDatasetUpdated)
    return () => {
      window.removeEventListener('dataset-updated', handleDatasetUpdated)
      clearTimeout(dismissTimer)
    }
  }, [])

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

  return (
    <>
      <OfflineAuthNotice />
      <ReactivationBanner />
      <OfflineIndicator />
      {datasetUpdated && (
        <div className="toast toast-top toast-center z-50">
          <div className="alert alert-info gap-2">
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
              Vocabulary updated — new words available
            </span>
          </div>
        </div>
      )}
      <div className="flex min-h-screen lg:h-screen lg:overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 lg:overflow-hidden">
          <DesktopTopBar />
          <main className="flex-1 pb-16 lg:pb-0 lg:overflow-y-auto min-h-0">
            <Outlet />
          </main>
        </div>
        <BottomDock />
      </div>
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
