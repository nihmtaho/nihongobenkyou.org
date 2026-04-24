import { createFileRoute, Link } from '@tanstack/react-router'

import { useLessons } from '../../../hooks/useLessons'
import { useVocabulary } from '../../../hooks/useVocabulary'
import { datasets } from '../../../lib/datasets.config'

export const Route = createFileRoute('/books/$book/')({
  component: BookPage,
})

function BookPage() {
  const { book } = Route.useParams()
  const dataset = datasets.find(d => d.id === book)
  const { data: lessons, isLoading } = useLessons(book)

  if (!dataset) {
    return (
      <div className="p-4">
        <p className="font-[var(--br-mono-font)] text-neutral">Dataset not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight mb-2">
        {dataset.title}
      </h1>
      <p className="text-sm text-neutral font-[var(--br-jp-font)] mb-6">{dataset.title_vi}</p>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => `skel-${i}`).map(key => (
            <div key={key} className="skeleton h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && lessons && lessons.length === 0 && (
        <p className="font-[var(--br-mono-font)] text-neutral text-sm">
          No lessons — run `pnpm run build:dataset`
        </p>
      )}

      {!isLoading && lessons && lessons.length > 0 && (
        <div className="flex flex-col gap-2">
          {lessons.map(lesson => (
            <LessonRow key={lesson.lesson_id} bookId={book} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  )
}

interface LessonRowProps {
  bookId: string
  lesson: { lesson_id: string, lesson_number: number, title: string, vocab_count: number, book_source: string }
}

function LessonRow({ bookId, lesson }: LessonRowProps) {
  const { data: vocabItems } = useVocabulary(lesson.book_source, lesson.lesson_number)
  const total = vocabItems?.length ?? lesson.vocab_count
  const reviewedCount = 0

  return (
    <Link to="/books/$book/$lesson" params={{ book: bookId, lesson: String(lesson.lesson_number).padStart(2, '0') }}>
      <div className="card bg-base-200 border border-base-content/10 transition-colors hover:border-l-4 hover:border-l-primary cursor-pointer">
        <div className="card-body p-4 gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--br-heading-font)] text-xl uppercase">
              LESSON
              {' '}
              {String(lesson.lesson_number).padStart(2, '0')}
            </h2>
            <span className="text-[11px] font-[var(--br-mono-font)] text-neutral uppercase">
              {total}
              {' '}
              WORDS
            </span>
          </div>
          {lesson.title && (
            <p className="text-sm text-neutral">{lesson.title}</p>
          )}
          <progress
            className="progress progress-primary h-1 w-full"
            value={reviewedCount}
            max={total}
          />
        </div>
      </div>
    </Link>
  )
}
