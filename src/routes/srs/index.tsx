import { createFileRoute, redirect } from '@tanstack/react-router'
import { SrsEmptyState } from '../../components/srs/SrsEmptyState'
import { SrsHeader } from '../../components/srs/SrsHeader'
import { SrsPreSession } from '../../components/srs/SrsPreSession'
import { FlipCard } from '../../components/study/FlipCard'
import { SessionSummary } from '../../components/study/SessionSummary'
import { TypeInputCard } from '../../components/study/TypeInputCard'
import { useSrsSession } from '../../hooks/useSrsSession'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/srs/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: SrsPage,
})

function SrsPage() {
  const session = useSrsSession()

  if (session.phase === 'loading') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full max-w-sm mx-auto" />
      </div>
    )
  }

  if (session.phase === 'empty') {
    return (
      <SrsEmptyState
        totalCardCount={session.totalCardCount}
        futureCards={session.futureCards}
      />
    )
  }

  if (session.phase === 'pre-session') {
    return (
      <SrsPreSession
        dueCardsCount={session.dueCards?.length ?? 0}
        srsMode={session.srsMode}
        onSetSrsMode={session.setSrsMode}
        typeInputSubMode={session.typeInputSubMode}
        onSetTypeInputSubMode={session.setTypeInputSubMode}
        onStart={session.startSession}
        startError={session.startError}
        vocabLoadFailed={session.vocabLoadFailed}
        isVocabReady={session.isVocabReady}
      />
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
        streak={session.streak}
      />
    )
  }

  // active
  const card = session.queue[session.currentIndex]
  const progress = session.currentIndex + 1

  return (
    <div className={`flex flex-col gap-4 ${session.srsMode === 'type-input' ? 'pt-4' : 'p-4'}`}>
      <SrsHeader
        current={progress}
        total={session.queue.length}
        elapsed={session.elapsed}
        srsMode={session.srsMode}
      />
      {!card
        ? <div className="skeleton h-64 w-full max-w-sm mx-auto" />
        : session.srsMode === 'type-input'
          ? (
              <TypeInputCard
                key={`${card.vocab_id}-${session.currentIndex}`}
                card={card}
                subMode={session.typeInputSubMode}
                onAnswer={session.handleAnswer}
              />
            )
          : (
              <FlipCard
                card={card}
                meaningLanguage={session.meaningLanguage}
                onRate={session.handleRate}
              />
            )}
    </div>
  )
}
