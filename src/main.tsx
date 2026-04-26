import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { seedDatabase } from './db/seed'
import { flushPendingSync } from './db/sync'
import { routeTree } from './routeTree.gen'
import './app.css'

window.addEventListener('online', () => {
  flushPendingSync().catch(() => {})
})

// Seed Dexie from public/data on first load; skipped if checksum matches
seedDatabase().catch(console.error)

const queryClient = new QueryClient()

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
