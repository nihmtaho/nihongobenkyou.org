import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/leaderboard')({
  component: lazyRouteComponent(() => import('./leaderboard.component')),
})
