import type { VocabTypeSubMode } from '../../components/kanji/KanjiVocabTypeInputCard'
import type { MeaningLanguage } from '../../types/study'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { KanjiQuizCard } from '../../components/kanji/KanjiQuizCard'
import { KanjiStudyFlipCard } from '../../components/kanji/KanjiStudyFlipCard'
import { KanjiTypeInputCard } from '../../components/kanji/KanjiTypeInputCard'
import { KanjiVocabFlipCard } from '../../components/kanji/KanjiVocabFlipCard'
import { KanjiVocabTypeInputCard } from '../../components/kanji/KanjiVocabTypeInputCard'
import { QuizCard } from '../../components/study/QuizCard'
import { SessionSummary } from '../../components/study/SessionSummary'
import { useKanjiLessonSession } from '../../hooks/useKanjiLessonSession'
import { useAuthStore } from '../../stores/authStore'

interface LessonStudySearch {
  lesson: number
  type: 'kanji' | 'vocab'
  mode: 'flashcard' | 'quiz' | 'type'
  vocabSubMode?: VocabTypeSubMode
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
    vocabSubMode: (['word→hira', 'vi→hira', 'word→vi+hanviet'] as const).includes(search.vocabSubMode as VocabTypeSubMode)
      ? search.vocabSubMode as VocabTypeSubMode
      : undefined,
  }),
  component: KanjiLessonStudyPage,
})

const MODE_LABELS = {
  flashcard: 'Flashcard',
  quiz: 'Trắc nghiệm',
  type: 'Gõ từ',
} as const

const TYPE_LABELS = {
  kanji: '単漢字',
  vocab: 'Từ vựng',
} as const

function KanjiLessonStudyPage() {
  const { lesson, type, mode, vocabSubMode } = Route.useSearch()
  const session = useKanjiLessonSession(lesson, type)

  if (session.phase === 'loading') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full max-w-sm mx-auto" />
      </div>
    )
  }

  if (session.phase === 'pre-session') {
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
          {session.totalItems}
          {' '}
          {type === 'kanji' ? 'hán tự' : 'từ vựng'}
        </p>
        {session.totalItems === 0
          ? (
              <p className="text-sm text-base-content/40 font-[var(--br-mono-font)]">
                {type === 'vocab' ? 'Không có từ vựng kanji trong bài này.' : 'Không có hán tự trong bài này.'}
              </p>
            )
          : (
              <button
                type="button"
                onClick={session.handleStart}
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

  if (session.phase === 'complete') {
    return (
      <SessionSummary
        stats={{
          correct: session.stats.correct,
          total: session.stats.total,
          startTime: session.stats.startTime,
          wrongCards: [],
        }}
        mode="flashcard"
        ratingCounts={session.stats.ratingCounts}
      />
    )
  }

  // active
  const queueLength = type === 'kanji' ? session.kanjiQueue.length : session.vocabQueue.length

  let activeCard: React.ReactNode = null
  if (type === 'kanji') {
    const item = session.kanjiQueue[session.currentIndex]
    if (item) {
      if (mode === 'flashcard') {
        activeCard = <KanjiStudyFlipCard key={item.kanji.char} kanji={item.kanji} onRate={session.handleKanjiRate} />
      }
      else if (mode === 'quiz') {
        activeCard = (
          <KanjiQuizCard
            key={item.kanji.char}
            kanji={item.kanji}
            pool={session.kanjiQueue.map(q => q.kanji)}
            onAnswer={session.handleKanjiAnswer}
          />
        )
      }
      else if (mode === 'type') {
        activeCard = (
          <KanjiTypeInputCard
            key={item.kanji.char}
            prompt={item.kanji.char}
            answer={item.kanji.han_viet ?? ''}
            onAnswer={session.handleKanjiAnswer}
          />
        )
      }
    }
  }
  else {
    const vocab = session.vocabQueue[session.currentIndex]
    if (vocab) {
      if (mode === 'flashcard') {
        activeCard = (
          <KanjiVocabFlipCard
            key={vocab.vocab_id}
            card={vocab}
            hanVietMap={session.hanVietMap}
            meaningLanguage={'vi' as MeaningLanguage}
            onRate={session.handleVocabRate}
          />
        )
      }
      else if (mode === 'quiz') {
        activeCard = (
          <QuizCard
            key={vocab.vocab_id}
            card={vocab}
            pool={session.vocabQueue}
            meaningLanguage={'vi' as MeaningLanguage}
            onAnswer={session.handleVocabAnswer}
          />
        )
      }
      else if (mode === 'type') {
        const subMode = vocabSubMode ?? 'word→hira'
        activeCard = (
          <KanjiVocabTypeInputCard
            key={`${vocab.vocab_id}:${subMode}`}
            card={vocab}
            hanVietMap={session.hanVietMap}
            subMode={subMode}
            onAnswer={session.handleVocabAnswer}
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
          {session.currentIndex + 1}
          {' / '}
          {queueLength}
        </span>
      </div>

      <progress
        className="progress progress-primary h-0.5 w-full"
        value={session.currentIndex + 1}
        max={queueLength}
      />

      {activeCard}
    </div>
  )
}
