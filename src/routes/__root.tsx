import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { BottomDock } from '../components/navigation/BottomDock'
import { Sidebar } from '../components/navigation/Sidebar'
import { OfflineIndicator } from '../components/offline/OfflineIndicator'
import { useAuth } from '../hooks/useAuth'
import { useSettingsStore } from '../stores/settingsStore'

function RootLayout() {
  const activeTheme = useSettingsStore(s => s.activeTheme)
  const fontSize = useSettingsStore(s => s.fontSize)

  useAuth()

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
      <OfflineIndicator />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-16 lg:pb-0">
          <Outlet />
        </main>
        <BottomDock />
      </div>
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
