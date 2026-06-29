import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Toaster } from '@/components/ui/sonner'
import { SWUpdateBanner } from '@/components/ui/sw-update-banner'
import { useSettingsStore } from './stores/settingsStore'

interface AppProps {
  queryClient: QueryClient
  router: AnyRouter
}

export function App({ queryClient, router }: AppProps) {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ onNeedRefresh() {} })
  const darkMode = useSettingsStore(s => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
        {needRefresh && <SWUpdateBanner onUpdate={() => updateServiceWorker(true)} />}
      </QueryClientProvider>
    </MotionConfig>
  )
}
