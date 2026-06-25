import { createFileRoute, redirect } from '@tanstack/react-router'
import { StrokeOrderAnimation } from '../../components/kanji/StrokeOrderAnimation'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useKanji } from '../../hooks/useKanji'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/$char/stroke')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: StrokeOrderPage,
})

function StrokeOrderPage() {
  const { char } = Route.useParams()
  const { data: kanji, isLoading } = useKanji(char)

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-sm mx-auto">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Go back"
        className="self-start -ml-2 -mt-2"
        onClick={() => window.history.back()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Button>

      {/* Header */}
      <div className="flex items-baseline gap-4">
        <p
          className="text-6xl font-bold"
          style={{ fontFamily: 'var(--br-jp-font)' }}
        >
          {char}
        </p>
        <p className="font-[var(--br-heading-font)] text-xl uppercase tracking-wide text-muted-foreground">
          Stroke Order
        </p>
      </div>

      {/* Animation or fallback */}
      {kanji?.stroke_paths && kanji.stroke_paths.length > 0
        ? (
            <StrokeOrderAnimation strokes={kanji.stroke_paths} char={char} />
          )
        : (
            <div className="bg-card border border-border/10 p-6 flex flex-col items-center gap-3">
              <p className="font-[var(--br-mono-font)] text-sm uppercase text-muted-foreground text-center">
                Stroke data unavailable for this kanji
              </p>
              <p className="font-[var(--br-jp-font)] text-sm text-muted-foreground/60 text-center">
                KanjiVG data for
                {' '}
                {char}
                {' '}
                has not been loaded yet.
              </p>
            </div>
          )}
    </div>
  )
}
