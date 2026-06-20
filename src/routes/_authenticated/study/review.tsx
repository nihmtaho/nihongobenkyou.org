import type { VocabTypeSubMode } from '../../../components/kanji/KanjiVocabTypeInputCard'
import type { SRSRating } from '../../../types/srs'
import type { MeaningLanguage } from '../../../types/study'
import type { CardTypeFilter, UnifiedCard } from '../../../types/unified-card'
import type { VocabWithSRS } from '../../../types/vocabulary'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { KanjiQuizCard } from '../../../components/kanji/KanjiQuizCard'
import { KanjiStudyFlipCard } from '../../../components/kanji/KanjiStudyFlipCard'
import { KanjiTypeInputCard } from '../../../components/kanji/KanjiTypeInputCard'
import { KanjiVocabFlipCard } from '../../../components/kanji/KanjiVocabFlipCard'
import { KanjiVocabQuizCard } from '../../../components/kanji/KanjiVocabQuizCard'
import { KanjiVocabTypeInputCard } from '../../../components/kanji/KanjiVocabTypeInputCard'
import { ListeningCard } from '../../../components/study/ListeningCard'
import { PitchDiscriminationCard } from '../../../components/study/PitchDiscriminationCard'
import { PreSessionScreen } from '../../../components/study/PreSessionScreen'
import { QuizCard } from '../../../components/study/QuizCard'
import { SentenceFlashcard } from '../../../components/study/SentenceFlashcard'
import { SessionSummary } from '../../../components/study/SessionSummary'
import { TypeInputCard } from '../../../components/study/TypeInputCard'
import { VocabFlipCard } from '../../../components/study/VocabFlipCard'
import { useUnifiedSrsSession } from '../../../hooks/useUnifiedSrsSession'
import { useAuthStore } from '../../../stores/authStore'
import { useStudySessionStore } from '../../../stores/studySessionStore'

const VALID_FILTERS: CardTypeFilter[] = ['all', 'vocab', 'kanji', 'decks']

export const Route = createFileRoute('/_authenticated/study/review')({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: VALID_FILTERS.includes(search.filter as CardTypeFilter)
      ? (search.filter as CardTypeFilter)
      : ('all' as CardTypeFilter),
  }),
  component: StudyReviewPage,
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

function StudyReviewPage() {
  const { filter } = Route.useSearch()
  const userId = useAuthStore(s => s.userId) ?? ''
  const navigate = useNavigate()

  const storeQueue = useStudySessionStore(s => s.queue)
  const storeMode = useStudySessionStore(s => s.mode)
  const storeSubMode = useStudySessionStore(s => s.typeInputSubMode)
  const storeDeckSource = useStudySessionStore(s => s.deckSource)
  const storeCustomDeckId = useStudySessionStore(s => s.customDeckId)
  const clearSession = useStudySessionStore(s => s.clearSession)
  const setSessionWrongCards = useStudySessionStore(s => s.setSessionWrongCards)

  // Captured at mount: true means the user already chose a mode in the lesson/deck popup.
  // Using a ref because storeQueue will be cleared after session init, so a variable would
  // lose this signal on re-renders.
  const wasPrebuiltLaunchRef = useRef(storeQueue.length > 0)

  const prebuilt = storeQueue.length > 0 ? storeQueue : undefined
  const session = useUnifiedSrsSession(userId, filter, prebuilt
    ? {
        prebuiltQueue: prebuilt,
        initialMode: storeMode ?? 'flashcard',
        initialSubMode: storeSubMode,
        customDeckId: storeDeckSource === 'custom-deck' ? (storeCustomDeckId ?? undefined) : undefined,
      }
    : undefined)

  // Track latest wrongCards via ref so the effect below doesn't need them in its deps.
  const sessionWrongCardsRef = useRef(session.stats.wrongCards)
  sessionWrongCardsRef.current = session.stats.wrongCards

  // Clear the store once the session ends so a next navigation starts fresh.
  // Also persist wrong cards to the store so the lesson page can display the retry banner.
  useEffect(() => {
    if (session.phase === 'complete') {
      const wc = sessionWrongCardsRef.current
      clearSession()
      if (wc.length > 0) {
        setSessionWrongCards(wc)
      }
    }
  }, [session.phase, clearSession, setSessionWrongCards])

  // Auto-start for lesson/deck launches — mode was already chosen in the popup.
  useEffect(() => {
    if (wasPrebuiltLaunchRef.current && session.phase === 'pre-session') {
      session.startSession()
    }
    // session object identity is not stable but session.phase and session.startSession are the
    // only values read here. Adding session would re-run on every render unnecessarily.
    // eslint-disable-next-line react/exhaustive-deps
  }, [session.phase, session.startSession])

  // Managed here so it persists across cards in listening mode
  const [playbackRate, setPlaybackRate] = useState(1.0)

  if (session.phase === 'loading') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-sm mx-auto" />
      </div>
    )
  }

  if (session.phase === 'pre-session') {
    return (
      <PreSessionScreen
        filter={filter}
        vocabCount={session.vocabCount}
        kanjiCount={session.kanjiCount}
        kanjiVocabCount={session.kanjiVocabCount}
        mode={session.mode}
        typeInputSubMode={session.typeInputSubMode}
        onSetMode={session.setMode}
        onSetTypeInputSubMode={session.setTypeInputSubMode}
        onStart={session.startSession}
        onBack={() => navigate({ to: '/study', search: { tab: 'vocab' } })}
        newCount={session.newCount}
        reviewCount={session.reviewCount}
      />
    )
  }

  if (session.phase === 'complete') {
    return (
      <SessionSummary
        userId={userId}
        stats={{
          correct: session.stats.correct,
          total: session.stats.total,
          startTime: session.stats.startTime,
          wrongCards: session.stats.wrongCards,
        }}
        mode={session.mode}
        ratingCounts={session.stats.ratingCounts}
      />
    )
  }

  const card = session.currentCard
  if (!card)
    return <Skeleton className="h-64 w-full max-w-sm mx-auto" />

  const progress = session.currentIndex + 1
  const total = session.queue.length

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-foreground/60">
          {progress}
          {' '}
          /
          {' '}
          {total}
        </span>
        <div className="flex-1 h-0.5 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(progress / total) * 100}%` }} />
        </div>
      </div>

      {renderCard(card, session, playbackRate, setPlaybackRate)}
    </div>
  )
}

function renderCard(
  card: UnifiedCard,
  session: ReturnType<typeof useUnifiedSrsSession>,
  playbackRate: number,
  setPlaybackRate: (r: number) => void,
) {
  const { mode, meaningLanguage, currentIndex, queue } = session
  // meaningLanguage comes from session (via useSettingsStore internally) — no need to duplicate the selector here
  const onRate = (rating: SRSRating) => session.handleRate(card, rating)

  if (card.kind === 'vocab') {
    const vocabPool = queue
      .filter((c): c is Extract<UnifiedCard, { kind: 'vocab' }> => c.kind === 'vocab')
      .map(c => c.card)

    switch (mode) {
      case 'quiz':
        return (
          <QuizCard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            pool={vocabPool}
            meaningLanguage={meaningLanguage as MeaningLanguage}
            onRate={onRate}
          />
        )
      case 'type-input':
        return (
          <TypeInputCard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            subMode={session.typeInputSubMode}
            onRate={onRate}
          />
        )
      case 'sentence-flashcard':
        return (
          <SentenceFlashcard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            meaningLanguage={meaningLanguage as MeaningLanguage}
            onRate={onRate}
          />
        )
      case 'listening':
        return (
          <ListeningCard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            distractors={vocabPool.filter(c => c.vocab_id !== card.card.vocab_id).slice(0, 3)}
            playbackRate={playbackRate}
            onRateChange={setPlaybackRate}
            onRate={onRate}
          />
        )
      case 'pitch-discrimination':
        return (
          <PitchDiscriminationCard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            onRate={onRate}
          />
        )
      default:
        return (
          <VocabFlipCard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            meaningLanguage={meaningLanguage as MeaningLanguage}
            onRate={onRate}
          />
        )
    }
  }

  if (card.kind === 'kanji') {
    const kanjiPool = queue
      .filter((c): c is Extract<UnifiedCard, { kind: 'kanji' }> => c.kind === 'kanji')
      .map(c => c.kanji)

    if (mode === 'quiz') {
      return (
        <KanjiQuizCard
          key={card.card.cardId + currentIndex}
          kanji={card.kanji}
          srsState={card.card}
          pool={kanjiPool.length >= 4 ? kanjiPool : [card.kanji]}
          onRate={onRate}
        />
      )
    }
    if (mode === 'type-input') {
      return (
        <KanjiTypeInputCard
          key={card.card.cardId + currentIndex}
          prompt={card.kanji.char}
          answer={card.kanji.han_viet ?? ''}
          hint={card.kanji.onyomi[0]}
          card={card.card}
          onRate={onRate}
        />
      )
    }
    return (
      <KanjiStudyFlipCard
        key={card.card.cardId + currentIndex}
        kanji={card.kanji}
        srsState={card.card}
        onRate={onRate}
      />
    )
  }

  // kind === 'kanji-vocab'
  const hanVietMap = new Map<string, string>(
    queue
      .filter((c): c is Extract<UnifiedCard, { kind: 'kanji-vocab' }> => c.kind === 'kanji-vocab')
      .filter(c => c.rv.han_viet != null)
      .map(c => [c.rv.kana, c.rv.han_viet!]),
  )

  const kvPool = queue
    .filter((c): c is Extract<UnifiedCard, { kind: 'kanji-vocab' }> => c.kind === 'kanji-vocab')
    .map(c => c.rv)

  // Construct VocabWithSRS shape — KanjiVocabFlipCard and KanjiVocabTypeInputCard
  // require VocabWithSRS, but kanji-vocab cards only carry CardState + RelatedVocabItem.
  // Fields not available (romaji, meaning_en, audio) are left empty/null.
  // Construct a VocabWithSRS-shaped object for components that need vocab display fields.
  // card.rv provides kana/word/han_viet/meaning_vi; card.card provides SRS state.
  // Fields unavailable for kanji-vocab (romaji, meaning_en, audio, etc.) default to empty/null.
  const vocabShaped: VocabWithSRS = {
    vocab_id: card.card.cardId,
    word: card.rv.word ?? null,
    reading: card.rv.kana,
    romaji: '',
    meaning_en: '',
    meaning_vi: card.rv.meaning_vi,
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: null,
    pos: [],
    jlpt_level: null,
    book_source: '',
    lesson_number: card.lessonNumber,
    examples: [],
    tags: [],
    deprecated: false,
    han_viet: card.rv.han_viet ?? null,
    state: card.card.state,
    stability: card.card.stability,
    difficulty: card.card.difficulty,
    elapsed_days: card.card.elapsed_days,
    scheduled_days: card.card.scheduled_days,
    reps: card.card.reps,
    lapses: card.card.lapses,
    last_review: card.card.last_review,
    due: card.card.due,
    last_rating: card.card.last_rating,
    pending_sync: card.card.pending_sync,
    updated_at: card.card.updated_at,
    is_known: card.card.is_known,
    consecutive_correct: card.card.consecutive_correct,
  }

  if (mode === 'quiz') {
    return (
      <KanjiVocabQuizCard
        key={card.card.cardId + currentIndex}
        rv={card.rv}
        card={card.card}
        pool={kvPool}
        onRate={onRate}
      />
    )
  }
  if (mode === 'type-input') {
    return (
      <KanjiVocabTypeInputCard
        key={card.card.cardId + currentIndex}
        card={vocabShaped}
        hanVietMap={hanVietMap}
        subMode={session.typeInputSubMode as VocabTypeSubMode}
        onRate={onRate}
      />
    )
  }
  return (
    <KanjiVocabFlipCard
      key={card.card.cardId + currentIndex}
      card={vocabShaped}
      hanVietMap={hanVietMap}
      meaningLanguage={meaningLanguage as MeaningLanguage}
      onRate={onRate}
    />
  )
}
