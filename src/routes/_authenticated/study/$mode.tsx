import type { StudyMode } from '../../../types/study'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ListeningCard } from '../../../components/study/ListeningCard'
import { PitchDiscriminationCard } from '../../../components/study/PitchDiscriminationCard'
import { QuizCard } from '../../../components/study/QuizCard'
import { ReadingComprehensionCard } from '../../../components/study/ReadingComprehensionCard'
import { SentenceFlashcard } from '../../../components/study/SentenceFlashcard'
import { SessionSummary } from '../../../components/study/SessionSummary'
import { TypeInputCard } from '../../../components/study/TypeInputCard'
import { VocabFlipCard } from '../../../components/study/VocabFlipCard'
import { db } from '../../../db/schema'
import { usePassages } from '../../../hooks/usePassages'
import { useSRS } from '../../../hooks/useSRS'
import { useAuthStore } from '../../../stores/authStore'
import { useSettingsStore } from '../../../stores/settingsStore'
import { useStudySessionStore } from '../../../stores/studySessionStore'

const VALID_MODES: StudyMode[] = [
  'flashcard',
  'quiz',
  'type-input',
  'sentence-flashcard',
  'listening',
  'reading-comprehension',
  'pitch-discrimination',
]

const MODE_LABELS: Record<StudyMode, string> = {
  'flashcard': 'THẺ TỪ',
  'quiz': 'TRẮC NGHIỆM',
  'type-input': 'GÕ TỪ',
  'sentence-flashcard': 'THẺ CÂU',
  'listening': 'NGHE HIỂU',
  'reading-comprehension': 'ĐỌC HIỂU',
  'pitch-discrimination': 'THANH ĐIỆU',
}

function sampleDistractors(queue: VocabWithSRS[], currentIndex: number, count: number): VocabWithSRS[] {
  const pool = queue.filter((_, i) => i !== currentIndex)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export const Route = createFileRoute('/_authenticated/study/$mode')({
  component: StudyPage,
})

function ProgressBar({ current, total, modeName, lessonNumber }: {
  current: number
  total: number
  modeName: string
  lessonNumber?: number
}) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">{modeName}</span>
          {lessonNumber !== undefined && (
            <>
              <span className="text-base-content/20 text-[10px]">·</span>
              <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral">
                BÀI
                {' '}
                {String(lessonNumber).padStart(2, '0')}
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-[var(--br-mono-font)] text-neutral tabular-nums">
          {current + 1}
          {' '}
          /
          {total}
        </span>
      </div>
      <div className="h-0.5 w-full bg-base-300">
        <div
          className="bg-primary h-0.5 transition-all duration-300"
          style={{ width: `${pct}%` }}
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
  const { queue, currentIndex, stats, mode: sessionMode, typeInputSubMode, markCorrect, markWrong, markAttempted, advanceCard }
    = useStudySessionStore()
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)
  const srs = useSRS('vocab', userId ?? '')
  const sessionWrittenRef = useRef(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)

  const firstCard = queue[0]
  const passagesQuery = usePassages(
    firstCard?.book_source ?? '',
    firstCard?.lesson_number ?? 0,
  )

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

  // Derive lesson context from the session queue for "back to lesson" navigation
  const lessonContext = firstCard
    ? { book: firstCard.book_source, lesson: firstCard.lesson_number }
    : undefined

  if (isComplete) {
    return (
      <SessionSummary
        stats={stats}
        mode={(sessionMode ?? 'flashcard') as StudyMode}
        lessonContext={lessonContext}
      />
    )
  }

  const currentCard = queue[currentIndex]

  function handleRate(rating: 0 | 1 | 2 | 3) {
    srs.rate(currentCard, rating)
    if (rating === 0)
      markWrong(currentCard)
    else markCorrect()
    advanceCard()
  }

  function handleAnswer(isCorrect: boolean) {
    if (mode !== 'type-input') {
      handleRate(isCorrect ? 2 : 0)
      return
    }

    const { rating, shouldRequeue } = srs.answerTypeInput(currentCard, isCorrect)

    if (shouldRequeue) {
      markWrong(currentCard)
      advanceCard()
    }
    else if (rating === 0) {
      markAttempted()
      advanceCard()
    }
    else {
      markCorrect()
      advanceCard()
    }
  }

  const passages = passagesQuery.data ?? []
  const currentPassage = passages.find(p => p.vocab_ids.includes(currentCard?.vocab_id ?? '')) ?? passages[0] ?? null
  const isTypeInput = mode === 'type-input'
  const modeName = MODE_LABELS[mode as StudyMode] ?? mode.toUpperCase()

  // type-input stays full-width (two-column grid); other modes center on desktop
  const outerClass = isTypeInput
    ? 'flex flex-col min-h-screen'
    : 'flex flex-col min-h-screen max-w-2xl mx-auto'

  return (
    <div className={outerClass}>
      <div className={isTypeInput ? 'px-4 pt-4' : 'p-4 pt-6'}>
        <ProgressBar
          current={currentIndex}
          total={queue.length}
          modeName={modeName}
          lessonNumber={firstCard?.lesson_number}
        />
      </div>

      {mode === 'flashcard' && (
        <VocabFlipCard
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
          subMode={typeInputSubMode}
          onAnswer={handleAnswer}
        />
      )}

      {mode === 'sentence-flashcard' && (
        <SentenceFlashcard
          key={`${currentCard.vocab_id}-${currentIndex}`}
          card={currentCard}
          meaningLanguage={meaningLanguage}
          onRate={handleRate}
        />
      )}

      {mode === 'listening' && (
        <ListeningCard
          key={`${currentCard.vocab_id}-${currentIndex}`}
          card={currentCard}
          distractors={sampleDistractors(queue, currentIndex, 3)}
          playbackRate={playbackRate}
          onRateChange={setPlaybackRate}
          onRate={handleRate}
        />
      )}

      {mode === 'reading-comprehension' && (
        currentPassage
          ? (
              <ReadingComprehensionCard
                key={`${currentCard.vocab_id}-${currentIndex}`}
                passage={currentPassage}
                card={currentCard}
                onRate={handleRate}
              />
            )
          : (
              <SentenceFlashcard
                key={`${currentCard.vocab_id}-${currentIndex}`}
                card={currentCard}
                meaningLanguage={meaningLanguage}
                onRate={handleRate}
              />
            )
      )}

      {mode === 'pitch-discrimination' && (
        <PitchDiscriminationCard
          key={`${currentCard.vocab_id}-${currentIndex}`}
          card={currentCard}
          onRate={handleRate}
        />
      )}
    </div>
  )
}
