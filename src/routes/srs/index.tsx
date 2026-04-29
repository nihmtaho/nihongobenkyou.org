import type { SRSRating } from '../../types/srs'
import type { TypeInputSubMode } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FlipCard } from '../../components/study/FlipCard'
import { SessionSummary } from '../../components/study/SessionSummary'
import { TypeInputCard } from '../../components/study/TypeInputCard'
import { db } from '../../db/schema'
import { useSRS } from '../../hooks/useSRS'
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
  const srs = useSRS('vocab', userId ?? '')
  const { data: dueCards, isLoading } = srs.dueCards
  const { data: streak } = useStreak(userId ?? '')

  const [phase, setPhase] = useState<SrsState>('loading')
  const [startError, setStartError] = useState<string | null>(null)
  const [srsMode, setSrsMode] = useState<'flashcard' | 'type-input'>('flashcard')
  const [typeInputSubMode, setTypeInputSubMode] = useState<TypeInputSubMode>('word→hira')
  const [queue, setQueue] = useState<VocabWithSRS[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<SrsStats>(makeInitialStats)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionWrittenRef = useRef(false)
  // Tracks how many times each card has been re-queued via Again in this session (flashcard mode)
  const againCountRef = useRef<Map<string, number>>(new Map())
  const [vocabLoadFailed, setVocabLoadFailed] = useState(false)
  const vocabItemsRef = useRef<{ vocab_id: string }[] | undefined>(undefined)

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

  const vocabIds = (dueCards ?? []).map(c => c.vocabId)
  const { data: vocabItems } = useQuery({
    queryKey: ['srs-vocab-prefetch', vocabIds],
    queryFn: () => db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray(),
    enabled: phase === 'pre-session' && vocabIds.length > 0 && !vocabLoadFailed,
    staleTime: 0,
    // Poll every 2s if vocabulary still empty (seed running in background). Stops once vocabLoadFailed.
    refetchInterval: query =>
      !vocabLoadFailed && (!query.state.data || query.state.data.length === 0) ? 2000 : false,
  })
  vocabItemsRef.current = vocabItems

  const vocabIdsKey = vocabIds.join(',')

  // After 8s with no vocabulary found, stop polling and surface a clear error.
  useEffect(() => {
    if (phase !== 'pre-session' || vocabIds.length === 0) {
      // eslint-disable-next-line react/set-state-in-effect
      setVocabLoadFailed(false)
      return
    }
    const timer = setTimeout(() => {
      if (!vocabItemsRef.current || vocabItemsRef.current.length === 0)
        setVocabLoadFailed(true)
    }, 8000)
    return () => clearTimeout(timer)
  }, [phase, vocabIdsKey, vocabIds.length])

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
        mode: srsMode,
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
  }, [phase, userId, stats, elapsed, srsMode])

  function handleStart() {
    if (!dueCards || dueCards.length === 0 || !vocabItems || vocabItems.length === 0)
      return

    const cardMap = new Map(dueCards.map(c => [c.vocabId, c]))
    const merged: VocabWithSRS[] = vocabItems
      .filter(v => cardMap.has(v.vocab_id))
      .map(v => ({
        ...v,
        ...cardMap.get(v.vocab_id)!,
        is_known: cardMap.get(v.vocab_id)?.is_known ?? false,
      }))

    if (merged.length === 0) {
      setStartError('Không tìm thấy dữ liệu thẻ. Vui lòng thử lại.')
      return
    }

    setStartError(null)
    setQueue(merged)
    setCurrentIndex(0)
    setStats(makeInitialStats())
    setElapsed(0)
    sessionWrittenRef.current = false
    againCountRef.current = new Map()
    srs.resetTypeInputTracking()
    setPhase('active')
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

    srs.rate(card, rating)

    const next = currentIndex + 1
    if (next >= queue.length) {
      setPhase('complete')
    }
    else {
      setCurrentIndex(next)
    }
  }

  function handleAnswer(isCorrect: boolean) {
    const card = queue[currentIndex]
    if (!card)
      return

    const { rating, shouldRequeue } = srs.answerTypeInput(card, isCorrect)

    setStats(s => ({
      ...s,
      correct: rating >= 2 ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
    }))

    if (shouldRequeue) {
      setQueue(q => [...q, card])
      setCurrentIndex(i => i + 1)
    }
    else {
      const next = currentIndex + 1
      if (next >= queue.length)
        setPhase('complete')
      else
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

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/50">Chế độ ôn tập</p>
          <div className="join w-full">
            <button
              type="button"
              onClick={() => setSrsMode('flashcard')}
              className={`btn join-item flex-1 font-[var(--br-mono-font)] text-[11px] uppercase ${srsMode === 'flashcard' ? 'btn-primary' : 'btn-outline'}`}
            >
              Lật thẻ
            </button>
            <button
              type="button"
              onClick={() => setSrsMode('type-input')}
              className={`btn join-item flex-1 font-[var(--br-mono-font)] text-[11px] uppercase ${srsMode === 'type-input' ? 'btn-primary' : 'btn-outline'}`}
            >
              Gõ từ
            </button>
          </div>

          {srsMode === 'type-input' && (
            <div className="flex flex-col gap-2 w-full">
              {(
                [
                  { value: 'word→hira' as TypeInputSubMode, label: 'Từ → Đọc' },
                  { value: 'vi→hira' as TypeInputSubMode, label: 'Nghĩa → Đọc' },
                  { value: 'word→vi' as TypeInputSubMode, label: 'Từ → Nghĩa Việt' },
                ]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypeInputSubMode(value)}
                  className={`btn w-full font-[var(--br-mono-font)] text-[11px] uppercase ${typeInputSubMode === value ? 'btn-neutral' : 'btn-outline'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {startError && (
          <div className="alert alert-warning max-w-sm w-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase">{startError}</span>
          </div>
        )}

        {vocabLoadFailed && (
          <div className="alert alert-error max-w-sm w-full">
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
              Không tìm thấy dữ liệu từ vựng cho các thẻ này. Thẻ có thể thuộc custom deck hoặc dữ liệu bị lỗi — hãy làm mới trang.
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={!vocabItems || vocabItems.length === 0}
          className="btn btn-primary btn-lg font-[var(--br-heading-font)] uppercase tracking-wide"
        >
          {!vocabItems?.length && !vocabLoadFailed ? 'Đang tải...' : 'Bắt đầu ôn tập'}
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
    <div className={`flex flex-col gap-4 ${srsMode === 'type-input' ? 'pt-4' : 'p-4'}`}>
      <div className={`flex items-center justify-between ${srsMode === 'type-input' ? 'px-4' : ''}`}>
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
        className={`progress progress-primary h-0.5 w-full ${srsMode === 'type-input' ? 'px-4' : ''}`}
        value={progress}
        max={queue.length}
      />

      {!card
        ? <div className="skeleton h-64 w-full max-w-sm mx-auto" />
        : srsMode === 'type-input'
          ? (
              <TypeInputCard
                key={`${card.vocab_id}-${currentIndex}`}
                card={card}
                subMode={typeInputSubMode}
                onAnswer={handleAnswer}
              />
            )
          : (
              <FlipCard
                card={card}
                meaningLanguage={meaningLanguage}
                onRate={handleRate}
              />
            )}
    </div>
  )
}
