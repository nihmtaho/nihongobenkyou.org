import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'

const VALID_FILTERS = ['all', 'vocab', 'kanji', 'decks'] as const
type CardTypeFilter = typeof VALID_FILTERS[number]

export const Route = createFileRoute('/_authenticated/study/review')({
  validateSearch: (search: Record<string, unknown>): { filter: CardTypeFilter } => ({
    filter: VALID_FILTERS.includes(search.filter as CardTypeFilter)
      ? (search.filter as CardTypeFilter)
      : 'all',
  }),
  component: lazyRouteComponent(() => import('./review.component')),
  errorComponent: ({ error }) => (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <p className="font-[var(--br-mono-font)] text-destructive uppercase text-sm">Lỗi phiên ôn tập</p>
      <p className="text-xs font-[var(--br-mono-font)] text-muted-foreground">{error?.message}</p>
      <a href="/study" className="font-[var(--br-mono-font)] text-xs uppercase underline">Quay lại Study</a>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
  ),
})
