import type { KanjiCardState } from '../../types/kanji'
import type { SRSRating } from '../../types/srs'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { KanjiStudyFlipCard } from '../../components/kanji/KanjiStudyFlipCard'
import { SessionSummary } from '../../components/study/SessionSummary'
import { db } from '../../db/schema'
import { useSRS } from '../../hooks/useSRS'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/review')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: KanjiReviewPage,
})

type Phase = 'loading' | 'empty' | 'pre-session' | 'active' | 'complete'

interface SessionStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
}

function KanjiReviewPage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const srs = useSRS('kanji', userId)
  const dueCards = srs.dueCards

  const [phase, setPhase] = useState<Phase>('loading')
  // Store full card objects so handleRate never depends on dueCards.data being current
  const [queue, setQueue] = useState<KanjiCardState[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<SessionStats>(() => ({
    correct: 0,
    total: 0,
    startTime: new Date(),
    ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 },
  }))

  const chars = queue.map(c => c.char)

  // Load kanji content for the review queue — staleTime:0 so a race with seedKanji
  // (kanji table empty at first query) auto-corrects on next mount/focus.
  const { data: kanjiItems, isLoading: kanjiLoading } = useQuery({
    queryKey: ['kanji-review-items', chars],
    queryFn: () => db.kanji.where('char').anyOf(chars).toArray(),
    enabled: chars.length > 0,
    staleTime: 0,
  })

  // Transition out of loading phase once due cards are known
  useEffect(() => {
    if (phase !== 'loading')
      return
    if (dueCards.isError) {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('empty')
      return
    }
    if (!dueCards.isSuccess)
      return
    // eslint-disable-next-line react/set-state-in-effect
    setPhase(dueCards.data.length > 0 ? 'pre-session' : 'empty')
  }, [phase, dueCards.isSuccess, dueCards.isError, dueCards.data])

  function handleStart() {
    if (!dueCards.data)
      return
    setQueue([...dueCards.data])
    setCurrentIndex(0)
    setStats({ correct: 0, total: 0, startTime: new Date(), ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 } })
    setPhase('active')
  }

  function handleRate(rating: SRSRating) {
    const card = queue[currentIndex]
    if (!card)
      return

    const isCorrect = rating >= 2
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
    }))

    srs.rate(card, rating)

    const next = currentIndex + 1
    if (next >= queue.length) {
      setPhase('complete')
    }
    else {
      setCurrentIndex(next)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full max-w-sm mx-auto" />
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase text-success">
          ALL KANJI REVIEWED!
        </h1>
        <p className="text-base-content/60 font-[var(--br-mono-font)] text-sm uppercase text-center">
          {dueCards.isError ? 'Failed to load review cards.' : 'No kanji cards due today.'}
        </p>
        <Link to="/kanji" className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase">
          ← Browse Kanji
        </Link>
      </div>
    )
  }

  if (phase === 'pre-session') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
          KANJI REVIEW
        </h1>
        <p className="font-[var(--br-mono-font)] text-sm uppercase text-base-content/60">
          {dueCards.data?.length ?? 0}
          {' '}
          kanji due
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="btn btn-primary btn-lg font-[var(--br-heading-font)] uppercase tracking-wide"
        >
          Start Review
        </button>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <SessionSummary
        stats={{
          correct: stats.correct,
          total: stats.total,
          startTime: stats.startTime,
          wrongCards: [],
        }}
        mode="flashcard"
        ratingCounts={stats.ratingCounts}
      />
    )
  }

  // Active session
  const currentCard = queue[currentIndex]
  const char = currentCard?.char
  const kanji = kanjiItems?.find(k => k.char === char)

  // Show skeleton while kanji content is loading or not yet found
  const isCardReady = !kanjiLoading && kanji !== undefined

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Back navigation */}
      <button
        type="button"
        aria-label="Go back"
        className="btn btn-ghost btn-sm self-start -ml-2 -mt-2"
        onClick={() => window.history.back()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="flex items-center justify-between">
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/60">
          {currentIndex + 1}
          {' / '}
          {queue.length}
        </span>
      </div>

      <progress
        className="progress progress-primary h-0.5 w-full"
        value={currentIndex + 1}
        max={queue.length}
      />

      {!isCardReady
        ? <div className="skeleton h-64 w-full max-w-sm mx-auto" />
        : <KanjiStudyFlipCard key={char} kanji={kanji} onRate={handleRate} />}
    </div>
  )
}
