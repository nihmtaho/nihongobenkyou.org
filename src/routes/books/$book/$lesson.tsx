import { createFileRoute } from '@tanstack/react-router'

import { VocabList } from '../../../components/vocabulary/VocabList'
import { useUserCards } from '../../../hooks/useUserCards'
import { useVocabulary } from '../../../hooks/useVocabulary'
import { useSettingsStore } from '../../../stores/settingsStore'

export const Route = createFileRoute('/books/$book/$lesson')({
  component: LessonPage,
})

function LessonPage() {
  const { book, lesson } = Route.useParams()
  const lessonNumber = Number(lesson)

  const { data: items = [], isLoading } = useVocabulary(book, lessonNumber)

  const nonDeprecated = items.filter(item => !item.deprecated)
  const vocabIds = nonDeprecated.map(item => item.vocab_id)

  // userId from settingsStore — Phase 1 uses empty string (auth added later)
  const userId = useSettingsStore(s => s.language) === 'vi' ? '' : ''

  const { data: cards = new Map() } = useUserCards(userId, vocabIds)

  return (
    <div>
      <div className="p-4 border-b border-base-content/10">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-1">
          {book.toUpperCase()}
        </p>
        <h1 className="text-7xl font-black font-[var(--br-heading-font)] tracking-tighter leading-none">
          {String(lessonNumber).padStart(2, '0')}
        </h1>
      </div>
      <VocabList
        items={nonDeprecated}
        cards={cards}
        userId={userId}
        isLoading={isLoading}
      />
    </div>
  )
}
