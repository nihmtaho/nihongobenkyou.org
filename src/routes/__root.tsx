import { createRootRoute, Outlet } from '@tanstack/react-router'

import { BottomDock } from '../components/navigation/BottomDock'
import { Sidebar } from '../components/navigation/Sidebar'
import { useSettingsStore } from '../stores/settingsStore'

function RootLayout() {
  const activeTheme = useSettingsStore(s => s.activeTheme)

  // Sync theme to HTML data-theme attribute before paint
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = activeTheme
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <BottomDock />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
