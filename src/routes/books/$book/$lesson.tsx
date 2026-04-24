import type { StudyConfig } from '../../../types/study'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { StudyConfigModal } from '../../../components/study/StudyConfigModal'
import { VocabList } from '../../../components/vocabulary/VocabList'
import { useUserCards } from '../../../hooks/useUserCards'
import { useVocabulary } from '../../../hooks/useVocabulary'
import { useAuthStore } from '../../../stores/authStore'
import { useStudySessionStore } from '../../../stores/studySessionStore'

export const Route = createFileRoute('/books/$book/$lesson')({
  component: LessonPage,
})

function LessonPage() {
  const { book, lesson } = Route.useParams()
  const lessonNumber = Number(lesson)
  const navigate = useNavigate()
  const [showConfig, setShowConfig] = useState(false)

  const { data: items = [], isLoading } = useVocabulary(book, lessonNumber)
  const nonDeprecated = items.filter(item => !item.deprecated)
  const vocabIds = nonDeprecated.map(item => item.vocab_id)

  const userId = useAuthStore(s => s.userId) ?? ''
  const { data: cards = new Map() } = useUserCards(userId, vocabIds)
  const initSession = useStudySessionStore(s => s.initSession)

  function handleStudyConfirm(config: StudyConfig) {
    const now = new Date().toISOString()
    const today = now.slice(0, 10)
    let merged: VocabWithSRS[] = nonDeprecated.map((v) => {
      const c = cards.get(v.vocab_id)
      if (c)
        return { ...v, ...c }
      return {
        ...v,
        userId,
        vocabId: v.vocab_id,
        interval_days: 1,
        ease_factor: 2.5,
        due_date: today,
        review_count: 0,
        last_rating: null,
        pending_sync: false,
        updated_at: now,
      }
    })

    if (config.order === 'random')
      merged = merged.sort(() => Math.random() - 0.5)
    if (config.cardCount !== 'all')
      merged = merged.slice(0, config.cardCount)

    initSession(merged, config.mode)
    navigate({ to: '/study/$mode', params: { mode: config.mode } })
  }

  const lessonMeta = [{ lesson_id: `${book}:${lessonNumber}`, lesson_number: lessonNumber }]

  return (
    <div>
      <div className="p-4 border-b border-base-content/10 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">
            {book.toUpperCase()}
          </p>
          <h1 className="text-7xl font-black font-[var(--br-heading-font)] tracking-tighter leading-none">
            {String(lessonNumber).padStart(2, '0')}
          </h1>
        </div>
        <button
          className="btn btn-primary font-[var(--br-mono-font)] mb-2"
          onClick={() => setShowConfig(true)}
          disabled={nonDeprecated.length === 0}
        >
          STUDY
        </button>
      </div>

      <VocabList
        items={nonDeprecated}
        cards={cards}
        userId={userId}
        isLoading={isLoading}
      />

      {showConfig && (
        <StudyConfigModal
          availableLessons={lessonMeta}
          defaultLessonIds={[`${book}:${lessonNumber}`]}
          onConfirm={handleStudyConfirm}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}
