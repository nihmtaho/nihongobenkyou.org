import type { SRSRating } from '../../types/srs'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FlipCard } from '../../components/study/FlipCard'
import { SessionSummary } from '../../components/study/SessionSummary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'
import { useSRSMutation } from '../../hooks/useSRSMutation'
import { useStreak } from '../../hooks/useStreak'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

export const Route = createFileRoute('/srs/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: SrsPage,
})

const MAX_AGAIN_REQUEUES = 3

type SrsState = 'loading' | 'empty' | 'pre-session' | 'active' | 'complete'

interface SrsStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function nextDueLabel(cards: { due_date: string }[]): string {
  if (cards.length === 0)
    return ''
  const next = cards.reduce((min, c) => (c.due_date < min ? c.due_date : min), cards[0].due_date)
  const diff = Math.max(0, Math.ceil((new Date(next).getTime() - Date.now()) / 60000))
  if (diff === 0)
    return 'ngay bây giờ'
  if (diff < 60)
    return `${diff} phút nữa`
  const hours = Math.floor(diff / 60)
  return `${hours} giờ nữa`
}

function makeInitialStats(): SrsStats {
  return { correct: 0, total: 0, startTime: new Date(), ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 } }
}

function SrsPage() {
  const userId = useAuthStore(s => s.userId)
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)
  const { data: dueCards, isLoading } = useDueCards(userId ?? '')
  const { data: streak } = useStreak(userId ?? '')
  const srsM = useSRSMutation()

  const [phase, setPhase] = useState<SrsState>('loading')
  const [queue, setQueue] = useState<VocabWithSRS[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<SrsStats>(makeInitialStats)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionWrittenRef = useRef(false)
  // Tracks how many times each card has been re-queued via Again in this session
  const againCountRef = useRef<Map<string, number>>(new Map())

  // These two queries only activate in the empty phase to differentiate the two empty states
  const { data: futureCards } = useQuery({
    queryKey: ['future-due-cards', userId],
    queryFn: async () =>
      db.user_cards
        .where('due_date')
        .above(new Date().toISOString().slice(0, 10))
        .filter(c => c.userId === userId && !c.is_known)
        .toArray(),
    enabled: !!userId && phase === 'empty',
    staleTime: 0,
  })

  const { data: totalCardCount } = useQuery({
    queryKey: ['total-user-cards', userId],
    queryFn: () => db.user_cards.where('userId').equals(userId ?? '').count(),
    enabled: !!userId && phase === 'empty',
    staleTime: 0,
  })

  useEffect(() => {
    if (isLoading)
      return
    if (!dueCards || dueCards.length === 0) {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('empty')
    }
    else if (phase === 'loading') {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('pre-session')
    }
  }, [isLoading, dueCards, phase])

  useEffect(() => {
    if (phase === 'active') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
    }
  }, [phase])

  // Write session + streak on completion
  useEffect(() => {
    if (phase !== 'complete' || sessionWrittenRef.current || !userId)
      return
    sessionWrittenRef.current = true

    const today = new Date().toISOString().slice(0, 10)
    const correct = stats.correct
    const total = stats.total

    async function writeRecords() {
      await db.sessions.add({
        user_id: userId!,
        mode: 'flashcard',
        lesson_ids: [],
        cards_reviewed: total,
        correct_count: correct,
        duration_sec: elapsed,
        studied_at: new Date(),
      })

      const existing = await db.streaks.get(today)
      if (existing) {
        await db.streaks.put({
          ...existing,
          cards_reviewed: existing.cards_reviewed + total,
        })
      }
      else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const prev = await db.streaks.where('date').equals(yesterday).first()
        await db.streaks.put({
          date: today,
          userId: userId!,
          cards_reviewed: total,
          current_streak: (prev?.current_streak ?? 0) + 1,
          max_streak: Math.max((prev?.max_streak ?? 0), (prev?.current_streak ?? 0) + 1),
        })
      }
    }

    writeRecords().catch(console.error)
  }, [phase, userId, stats, elapsed])

  function handleStart() {
    if (!dueCards)
      return
    const vocabIds = dueCards.map(c => c.vocabId)

    db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray().then((vocabItems) => {
      const cardMap = new Map(dueCards.map(c => [c.vocabId, c]))
      const merged: VocabWithSRS[] = vocabItems.map(v => ({
        ...v,
        ...cardMap.get(v.vocab_id)!,
        is_known: cardMap.get(v.vocab_id)?.is_known ?? false,
      }))
      setQueue(merged)
      setCurrentIndex(0)
      setStats(makeInitialStats())
      setElapsed(0)
      sessionWrittenRef.current = false
      againCountRef.current = new Map()
      setPhase('active')
    }).catch(console.error)
  }

  function handleRate(rating: SRSRating) {
    if (!userId)
      return
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

    if (rating === 0) {
      const count = againCountRef.current.get(card.vocab_id) ?? 0
      if (count < MAX_AGAIN_REQUEUES) {
        // Re-queue at end of session without changing Dexie until final rating
        againCountRef.current.set(card.vocab_id, count + 1)
        setQueue(q => [...q, card])
        setCurrentIndex(i => i + 1)
        return
      }
      // 4th Again: write to Dexie as due tomorrow and remove from session
    }

    srsM.mutate({ userId, card, rating })

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
    // No user_cards at all — user has never studied
    if (totalCardCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
          <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
            CHƯA CÓ THẺ
          </h1>
          <p className="text-base-content/60 font-[var(--br-mono-font)] text-sm uppercase text-center">
            Hãy thêm từ vựng để bắt đầu luyện tập
          </p>
          <Link to="/books" className="btn btn-primary btn-sm font-[var(--br-heading-font)] uppercase">
            Duyệt sách
          </Link>
        </div>
      )
    }

    // Cards exist but none are due today
    const nextLabel = futureCards && futureCards.length > 0
      ? nextDueLabel(futureCards.map(c => ({ due_date: c.due_date })))
      : ''

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase text-success">
          TẤT CẢ ĐÃ XONG!
        </h1>
        <p className="text-base-content/60 font-[var(--br-mono-font)] text-sm uppercase text-center">
          Không có thẻ nào đến hạn hôm nay
          {nextLabel ? ` — thẻ tiếp theo ${nextLabel}` : ''}
        </p>
        <Link to="/books" className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase">
          Xem sách
        </Link>
      </div>
    )
  }

  if (phase === 'pre-session') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
          ÔN TẬP HÀNG NGÀY
        </h1>
        <p className="font-[var(--br-mono-font)] text-sm uppercase text-base-content/60">
          {dueCards?.length ?? 0}
          {' '}
          thẻ đến hạn
        </p>
        <button
          onClick={handleStart}
          className="btn btn-primary btn-lg font-[var(--br-heading-font)] uppercase tracking-wide"
        >
          Bắt đầu ôn tập
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
        streak={streak?.current_streak}
      />
    )
  }

  // active
  const card = queue[currentIndex]
  const progress = currentIndex + 1

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/60">
          {progress}
          {' '}
          /
          {queue.length}
        </span>
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/60">
          {formatTime(elapsed)}
        </span>
      </div>

      <progress
        className="progress progress-primary h-0.5 w-full"
        value={progress}
        max={queue.length}
      />

      {card && (
        <FlipCard
          card={card}
          meaningLanguage={meaningLanguage}
          onRate={handleRate}
        />
      )}
    </div>
  )
}
