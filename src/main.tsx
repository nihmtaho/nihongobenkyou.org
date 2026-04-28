import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { seedDatabase, seedKanji } from './db/seed'
import { flushPendingSync } from './db/sync'
import { initAnonymousUser } from './lib/anonymous-user'
import { routeTree } from './routeTree.gen'
import './app.css'

window.addEventListener('online', () => {
  flushPendingSync().catch(() => {})
})

const queryClient = new QueryClient()
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!

async function bootstrap() {
  await initAnonymousUser()

  seedDatabase().then((result) => {
    if (result === 'seeded') {
      window.dispatchEvent(new CustomEvent('dataset-updated'))
    }
  }).catch(console.error)

  seedKanji().then((result) => {
    if (result === 'seeded') {
      window.dispatchEvent(new CustomEvent('kanji-seeded'))
    }
  }).catch(console.error)

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap().catch(console.error)
