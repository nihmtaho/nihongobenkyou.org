import type { KanjiCardState, KanjiItem } from '../../types/kanji'
import type { SRSRating } from '../../types/srs'
import type { MeaningLanguage } from '../../types/study'
import type { VocabWithSRS } from '../../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { KanjiQuizCard } from '../../components/kanji/KanjiQuizCard'
import { KanjiStudyFlipCard } from '../../components/kanji/KanjiStudyFlipCard'
import { KanjiTypeInputCard } from '../../components/kanji/KanjiTypeInputCard'
import { FlipCard } from '../../components/study/FlipCard'
import { QuizCard } from '../../components/study/QuizCard'
import { SessionSummary } from '../../components/study/SessionSummary'
import { getAllKanji, getKanjiByChars, getKanjiCardsForChars, getVocabContainingChars } from '../../db/kanji'
import { useSRS } from '../../hooks/useSRS'
import { useUserCards } from '../../hooks/useUserCards'
import { useAuthStore } from '../../stores/authStore'

interface LessonStudySearch {
  lesson: number
  type: 'kanji' | 'vocab'
  mode: 'flashcard' | 'quiz' | 'type'
}

export const Route = createFileRoute('/kanji/lesson-study')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  validateSearch: (search: Record<string, unknown>): LessonStudySearch => ({
    lesson: typeof search.lesson === 'number' ? search.lesson : Number(search.lesson),
    type: (search.type === 'kanji' || search.type === 'vocab') ? search.type : 'kanji',
    mode: (search.mode === 'flashcard' || search.mode === 'quiz' || search.mode === 'type')
      ? search.mode
      : 'flashcard',
  }),
  component: KanjiLessonStudyPage,
})

type Phase = 'loading' | 'pre-session' | 'active' | 'complete'

interface SessionStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
}

interface KanjiQueueItem {
  kanji: KanjiItem
  card: KanjiCardState | null
}

const MODE_LABELS = {
  flashcard: 'Flashcard',
  quiz: 'Trắc nghiệm',
  type: 'Gõ từ',
} as const

const TYPE_LABELS = {
  kanji: '単漢字',
  vocab: 'Từ vựng',
} as const

// ─── Kanji session ───────────────────────────────────────────────────────────

function useKanjiLessonData(userId: string, lesson: number) {
  const kanjiQuery = useQuery({
    queryKey: ['kanji-lesson-items', lesson],
    queryFn: () => getAllKanji({ lesson_number: lesson }),
    staleTime: Infinity,
  })

  const chars = useMemo(() => kanjiQuery.data?.map(k => k.char) ?? [], [kanjiQuery.data])

  const cardsQuery = useQuery({
    queryKey: ['kanji-lesson-cards', userId, lesson],
    queryFn: () => getKanjiCardsForChars(userId, chars),
    enabled: chars.length > 0,
    staleTime: 0,
  })

  const items = useMemo<KanjiQueueItem[]>(
    () => (kanjiQuery.data ?? []).map(k => ({
      kanji: k,
      card: cardsQuery.data?.find(c => c.char === k.char) ?? null,
    })),
    [kanjiQuery.data, cardsQuery.data],
  )

  return {
    items,
    isLoading: kanjiQuery.isLoading || (chars.length > 0 && cardsQuery.isLoading),
  }
}

// ─── Vocab session ────────────────────────────────────────────────────────────

function useVocabLessonData(userId: string, lesson: number) {
  const kanjiQuery = useQuery({
    queryKey: ['kanji-lesson-items', lesson],
    queryFn: () => getAllKanji({ lesson_number: lesson }),
    staleTime: Infinity,
  })

  const chars = useMemo(() => kanjiQuery.data?.map(k => k.char) ?? [], [kanjiQuery.data])

  const vocabQuery = useQuery({
    queryKey: ['kanji-lesson-vocab', lesson],
    queryFn: () => getVocabContainingChars(chars),
    enabled: chars.length > 0,
    staleTime: Infinity,
  })

  const vocabItems = useMemo(() => vocabQuery.data ?? [], [vocabQuery.data])
  const vocabIds = useMemo(() => vocabItems.map(v => v.vocab_id), [vocabItems])

  const { data: cards } = useUserCards(userId, vocabIds)

  // Collect unique kanji chars across all vocab words for han_viet lookup
  const kanjiCharsInVocab = useMemo(() => {
    const set = new Set<string>()
    vocabItems.forEach((v) => {
      if (v.word) {
        for (const ch of v.word) {
          // CJK Unified Ideographs range
          if (ch >= '一' && ch <= '鿿')
            set.add(ch)
        }
      }
    })
    return [...set]
  }, [vocabItems])

  const { data: kanjiForHanViet } = useQuery({
    queryKey: ['kanji-han-viet', kanjiCharsInVocab],
    queryFn: () => getKanjiByChars(kanjiCharsInVocab),
    enabled: kanjiCharsInVocab.length > 0,
    staleTime: Infinity,
  })

  const hanVietMap = useMemo(() => {
    const map = new Map<string, string>()
    kanjiForHanViet?.forEach((k) => {
      if (k.han_viet)
        map.set(k.char, k.han_viet)
    })
    return map
  }, [kanjiForHanViet])

  // Stable timestamp: computed once per hook instantiation (not each render)
  const sessionTimestamp = useMemo(() => new Date().toISOString(), [])
  const sessionToday = sessionTimestamp.slice(0, 10)

  const merged = useMemo<VocabWithSRS[]>(
    () => {
      function computeHanViet(word: string | null): string | null {
        if (!word)
          return null
        const parts: string[] = []
        for (const ch of word) {
          const hv = hanVietMap.get(ch)
          if (hv)
            parts.push(hv)
        }
        return parts.length > 0 ? parts.join(' ') : null
      }
      return vocabItems.map((v) => {
        const c = cards?.get(v.vocab_id)
        const han_viet = computeHanViet(v.word)
        if (c) {
          return {
            ...v,
            han_viet,
            interval_days: c.interval_days,
            ease_factor: c.ease_factor,
            due_date: c.due_date,
            review_count: c.review_count,
            last_rating: c.last_rating,
            pending_sync: c.pending_sync,
            updated_at: c.updated_at,
            is_known: c.is_known ?? false,
          }
        }
        return {
          ...v,
          han_viet,
          interval_days: 1,
          ease_factor: 2.5,
          due_date: sessionToday,
          review_count: 0,
          last_rating: null,
          pending_sync: false,
          updated_at: sessionTimestamp,
          is_known: false,
        }
      })
    },
    [vocabItems, cards, hanVietMap, sessionToday, sessionTimestamp],
  )

  return {
    vocab: merged,
    isLoading: kanjiQuery.isLoading || (chars.length > 0 && vocabQuery.isLoading),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function KanjiLessonStudyPage() {
  const { lesson, type, mode } = Route.useSearch()
  const userId = useAuthStore(s => s.userId) ?? ''

  const kanjiSRS = useSRS('kanji', userId)
  const vocabSRS = useSRS('vocab', userId)

  const kanjiData = useKanjiLessonData(userId, lesson)
  const vocabData = useVocabLessonData(userId, lesson)

  const isLoading = type === 'kanji' ? kanjiData.isLoading : vocabData.isLoading

  const [phase, setPhase] = useState<Phase>('loading')
  const [kanjiQueue, setKanjiQueue] = useState<KanjiQueueItem[]>([])
  const [vocabQueue, setVocabQueue] = useState<VocabWithSRS[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<SessionStats>(() => ({
    correct: 0,
    total: 0,
    startTime: new Date(),
    ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 },
  }))

  // Transition out of loading once data is ready
  useEffect(() => {
    if (phase !== 'loading')
      return
    if (!isLoading) {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('pre-session')
    }
  }, [phase, isLoading])

  function handleStart() {
    if (type === 'kanji') {
      setKanjiQueue([...kanjiData.items].sort(() => Math.random() - 0.5))
    }
    else {
      setVocabQueue([...vocabData.vocab].sort(() => Math.random() - 0.5))
    }
    setCurrentIndex(0)
    setStats({
      correct: 0,
      total: 0,
      startTime: new Date(),
      ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    setPhase('active')
  }

  function advance(isCorrect: boolean, rating: SRSRating) {
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
    }))
    const queueLength = type === 'kanji' ? kanjiQueue.length : vocabQueue.length
    if (currentIndex + 1 >= queueLength) {
      setPhase('complete')
    }
    else {
      setCurrentIndex(i => i + 1)
    }
  }

  function buildStubCard(char: string): KanjiCardState {
    const now = new Date()
    return {
      userId,
      char,
      interval_days: 0,
      ease_factor: 2.5,
      due_date: now.toISOString().slice(0, 10),
      review_count: 0,
      last_rating: null,
      pending_sync: false,
      updated_at: now.toISOString(),
    }
  }

  function handleKanjiRate(rating: SRSRating) {
    const item = kanjiQueue[currentIndex]
    if (!item)
      return
    kanjiSRS.rate(item.card ?? buildStubCard(item.kanji.char), rating)
    advance(rating >= 2, rating)
  }

  function handleKanjiAnswer(correct: boolean) {
    handleKanjiRate(correct ? 2 : 0)
  }

  function handleVocabRate(rating: SRSRating) {
    const vocab = vocabQueue[currentIndex]
    if (!vocab)
      return
    vocabSRS.rate(vocab, rating)
    advance(rating >= 2, rating)
  }

  function handleVocabAnswer(correct: boolean) {
    handleVocabRate(correct ? 2 : 0)
  }

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full max-w-sm mx-auto" />
      </div>
    )
  }

  const totalItems = type === 'kanji' ? kanjiData.items.length : vocabData.vocab.length

  // ── Pre-session ──
  if (phase === 'pre-session') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <div className="text-center">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-2">
            {TYPE_LABELS[type]}
            {' '}
            ·
            {' '}
            {MODE_LABELS[mode]}
          </p>
          <h1 className="text-5xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
            BÀI
            {' '}
            {String(lesson).padStart(2, '0')}
          </h1>
        </div>
        <p className="font-[var(--br-mono-font)] text-sm uppercase text-base-content/60">
          {totalItems}
          {' '}
          {type === 'kanji' ? 'hán tự' : 'từ vựng'}
        </p>
        {totalItems === 0
          ? (
              <p className="text-sm text-base-content/40 font-[var(--br-mono-font)]">
                {type === 'vocab' ? 'Không có từ vựng kanji trong bài này.' : 'Không có hán tự trong bài này.'}
              </p>
            )
          : (
              <button
                type="button"
                onClick={handleStart}
                className="btn btn-primary btn-lg font-[var(--br-heading-font)] uppercase tracking-wide"
              >
                Bắt đầu
              </button>
            )}
        <Link to="/kanji" className="btn btn-ghost btn-sm font-[var(--br-mono-font)] uppercase text-[11px]">
          ← Hán tự
        </Link>
      </div>
    )
  }

  // ── Complete ──
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

  // ── Active session ──
  const queueLength = type === 'kanji' ? kanjiQueue.length : vocabQueue.length

  // Build the active card node without IIFEs
  let activeCard: React.ReactNode = null
  if (type === 'kanji') {
    const item = kanjiQueue[currentIndex]
    if (item) {
      if (mode === 'flashcard') {
        activeCard = (
          <KanjiStudyFlipCard
            key={item.kanji.char}
            kanji={item.kanji}
            onRate={handleKanjiRate}
          />
        )
      }
      else if (mode === 'quiz') {
        activeCard = (
          <KanjiQuizCard
            key={item.kanji.char}
            kanji={item.kanji}
            pool={kanjiQueue.map(q => q.kanji)}
            onAnswer={handleKanjiAnswer}
          />
        )
      }
      else if (mode === 'type') {
        activeCard = (
          <KanjiTypeInputCard
            key={item.kanji.char}
            subMode="han-viet"
            prompt={item.kanji.char}
            answer={item.kanji.han_viet ?? ''}
            onAnswer={handleKanjiAnswer}
          />
        )
      }
    }
  }
  else {
    const vocab = vocabQueue[currentIndex]
    if (vocab) {
      if (mode === 'flashcard') {
        activeCard = (
          <FlipCard
            key={vocab.vocab_id}
            card={vocab}
            meaningLanguage={'vi' as MeaningLanguage}
            onRate={handleVocabRate}
          />
        )
      }
      else if (mode === 'quiz') {
        activeCard = (
          <QuizCard
            key={vocab.vocab_id}
            card={vocab}
            pool={vocabQueue}
            meaningLanguage={'vi' as MeaningLanguage}
            onAnswer={handleVocabAnswer}
          />
        )
      }
      else if (mode === 'type') {
        activeCard = (
          <KanjiTypeInputCard
            key={vocab.vocab_id}
            subMode="hiragana"
            prompt={vocab.meaning_vi}
            answer={vocab.reading}
            onAnswer={handleVocabAnswer}
          />
        )
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Go back"
          className="btn btn-ghost btn-sm -ml-2"
          onClick={() => window.history.back()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="badge badge-outline font-[var(--br-mono-font)] text-[10px] uppercase">
            {TYPE_LABELS[type]}
          </span>
          <span className="badge badge-outline font-[var(--br-mono-font)] text-[10px] uppercase">
            {MODE_LABELS[mode]}
          </span>
        </div>
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/60">
          {currentIndex + 1}
          {' / '}
          {queueLength}
        </span>
      </div>

      <progress
        className="progress progress-primary h-0.5 w-full"
        value={currentIndex + 1}
        max={queueLength}
      />

      {activeCard}
    </div>
  )
}
