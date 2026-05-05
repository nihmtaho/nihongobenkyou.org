import type { SRSRating } from '../../../types/srs'
import type { MeaningLanguage } from '../../../types/study'
import type { CardTypeFilter, UnifiedCard } from '../../../types/unified-card'
import type { VocabWithSRS } from '../../../types/vocabulary'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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

const VALID_FILTERS: CardTypeFilter[] = ['all', 'vocab', 'kanji', 'decks']

export const Route = createFileRoute('/_authenticated/study/review')({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: VALID_FILTERS.includes(search.filter as CardTypeFilter)
      ? (search.filter as CardTypeFilter)
      : ('all' as CardTypeFilter),
  }),
  component: StudyReviewPage,
})

function StudyReviewPage() {
  const { filter } = Route.useSearch()
  const userId = useAuthStore(s => s.userId) ?? ''
  const navigate = useNavigate()
  const session = useUnifiedSrsSession(userId, filter)
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
        onBack={() => navigate({ to: '/study', search: { tab: undefined } })}
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
          wrongCards: [],
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
            onAnswer={(isCorrect) => { onRate(isCorrect ? 2 : 0) }}
          />
        )
      case 'type-input':
        return (
          <TypeInputCard
            key={card.card.vocab_id + currentIndex}
            card={card.card}
            subMode={session.typeInputSubMode}
            onAnswer={(isCorrect) => { onRate(isCorrect ? 2 : 0) }}
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
          key={card.card.char + currentIndex}
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
          key={card.card.char + currentIndex}
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
        key={card.card.char + currentIndex}
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
    vocab_id: card.card.vocabId,
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
    interval_days: card.card.interval_days,
    ease_factor: card.card.ease_factor,
    due_date: card.card.due_date,
    review_count: card.card.review_count,
    last_rating: card.card.last_rating,
    pending_sync: card.card.pending_sync,
    updated_at: card.card.updated_at,
    is_known: card.card.is_known,
    consecutive_correct: card.card.consecutive_correct,
    card_stage: card.card.card_stage,
    learning_step: card.card.learning_step,
    lapse_count: card.card.lapse_count,
  }

  if (mode === 'quiz') {
    return (
      <KanjiVocabQuizCard
        key={card.card.vocabId + currentIndex}
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
        key={card.card.vocabId + currentIndex}
        card={vocabShaped}
        hanVietMap={hanVietMap}
        subMode="word→hira"
        onRate={onRate}
      />
    )
  }
  return (
    <KanjiVocabFlipCard
      key={card.card.vocabId + currentIndex}
      card={vocabShaped}
      hanVietMap={hanVietMap}
      meaningLanguage={meaningLanguage as MeaningLanguage}
      onRate={onRate}
    />
  )
}
