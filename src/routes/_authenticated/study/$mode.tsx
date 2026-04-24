import type { StudyMode } from '../../../types/study'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FlipCard } from '../../../components/study/FlipCard'
import { QuizCard } from '../../../components/study/QuizCard'
import { SessionSummary } from '../../../components/study/SessionSummary'
import { TypeInputCard } from '../../../components/study/TypeInputCard'
import { db } from '../../../db/schema'
import { useSRSMutation } from '../../../hooks/useSRSMutation'
import { useAuthStore } from '../../../stores/authStore'
import { useSettingsStore } from '../../../stores/settingsStore'
import { useStudySessionStore } from '../../../stores/studySessionStore'

const VALID_MODES: StudyMode[] = ['flashcard', 'quiz', 'type-input']

export const Route = createFileRoute('/_authenticated/study/$mode')({
  component: StudyPage,
})

function ProgressBar({ current, total }: { current: number, total: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <span className="text-[11px] font-[var(--br-mono-font)] text-neutral">
        {current + 1}
        {' '}
        /
        {total}
      </span>
      <div className="h-0.5 w-32 bg-base-300">
        <div
          className="bg-primary h-0.5 transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

function EmptySessionScreen({ onNavigate }: { onNavigate: () => void }) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => setCountdown(n => n - 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (countdown <= 0)
      onNavigate()
  }, [countdown, onNavigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <div role="alert" className="alert alert-info max-w-sm">
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase">
          No session active — redirecting in
          {' '}
          {countdown}
          s
        </span>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-6 w-2/3" />
        <div className="skeleton h-6 w-1/2" />
      </div>
      <button className="btn btn-primary font-[var(--br-mono-font)]" onClick={onNavigate}>
        GO TO BOOKS
      </button>
    </div>
  )
}

function StudyPage() {
  const { mode } = Route.useParams()
  const navigate = useNavigate()
  const { userId } = useAuthStore()
  const { queue, currentIndex, stats, mode: sessionMode, markCorrect, markWrong, advanceCard }
    = useStudySessionStore()
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)
  const srsm = useSRSMutation()
  const sessionWrittenRef = useRef(false)

  const isValidMode = VALID_MODES.includes(mode as StudyMode)

  useEffect(() => {
    if (!isValidMode)
      navigate({ to: '/books' })
  }, [isValidMode, navigate])

  const isComplete = currentIndex >= queue.length && queue.length > 0

  useEffect(() => {
    if (isComplete && !sessionWrittenRef.current && userId) {
      sessionWrittenRef.current = true
      const lessonIds = [...new Set(queue.map(c => `${c.book_source}:${c.lesson_number}`))]
      db.sessions.add({
        user_id: userId,
        mode: (sessionMode ?? 'flashcard') as StudyMode,
        lesson_ids: lessonIds,
        cards_reviewed: stats.total,
        correct_count: stats.correct,
        duration_sec: Math.round((Date.now() - stats.startTime.getTime()) / 1000),
        studied_at: new Date(),
      })
    }
  }, [isComplete, userId, queue, sessionMode, stats])

  if (queue.length === 0) {
    return <EmptySessionScreen onNavigate={() => navigate({ to: '/books' })} />
  }

  if (isComplete) {
    return <SessionSummary stats={stats} mode={(sessionMode ?? 'flashcard') as StudyMode} />
  }

  const currentCard = queue[currentIndex]

  function handleRate(rating: 0 | 1 | 2 | 3) {
    if (userId)
      srsm.mutate({ userId, card: currentCard, rating })
    if (rating === 0)
      markWrong(currentCard)
    else markCorrect()
    advanceCard()
  }

  function handleAnswer(isCorrect: boolean) {
    handleRate(isCorrect ? 2 : 0)
  }

  return (
    <div className="flex flex-col min-h-screen p-4 pt-8">
      <ProgressBar current={currentIndex} total={queue.length} />

      {mode === 'flashcard' && (
        <FlipCard
          key={`${currentCard.vocab_id}-${currentIndex}`}
          card={currentCard}
          meaningLanguage={meaningLanguage}
          onRate={handleRate}
        />
      )}

      {mode === 'quiz' && (
        <QuizCard
          key={`${currentCard.vocab_id}-${currentIndex}`}
          card={currentCard}
          pool={queue}
          meaningLanguage={meaningLanguage}
          onAnswer={handleAnswer}
        />
      )}

      {mode === 'type-input' && (
        <TypeInputCard
          key={`${currentCard.vocab_id}-${currentIndex}`}
          card={currentCard}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}
