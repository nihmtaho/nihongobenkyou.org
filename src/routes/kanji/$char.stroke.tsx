import { createFileRoute, lazyRouteComponent, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/$char/stroke')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: lazyRouteComponent(() => import('./$char.stroke.component')),
})
