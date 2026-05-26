import type { SRSStats } from '../../../components/common/SRSProgressBar'
import { createFileRoute, Link } from '@tanstack/react-router'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SRSProgressBar } from '../../../components/common/SRSProgressBar'
import { KanjiLessonPanel } from '../../../components/kanji/KanjiLessonPanel'
import { useBookProgress } from '../../../hooks/useBookProgress'
import { useDatasetReady } from '../../../hooks/useDatasetReady'
import { useLessons } from '../../../hooks/useLessons'
import { useUserCards } from '../../../hooks/useUserCards'
import { useVocabulary } from '../../../hooks/useVocabulary'
import { datasets } from '../../../lib/datasets.config'
import { formatNextReview } from '../../../lib/next-review'
import { useAuthStore } from '../../../stores/authStore'

function AnimatedNumber({ value, delay = 0 }: { value: number, delay?: number }) {
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v: number) => String(Math.round(v)))
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay })
    return () => c.stop()
  }, [value, mv, delay])
  return <motion.span>{display}</motion.span>
}

export const Route = createFileRoute('/books/$book/')({
  component: BookPage,
})

function BookPage() {
  const { book } = Route.useParams()
  const dataset = datasets.find(d => d.id === book)
  const { isReady: datasetReady, isLoading: datasetLoading } = useDatasetReady(book)
  const userId = useAuthStore(s => s.userId) ?? ''

  if (!dataset) {
    return (
      <div className="p-4">
        <p className="font-[var(--br-mono-font)] text-muted-foreground">Dataset not found.</p>
      </div>
    )
  }

  if (datasetLoading && !datasetReady) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-[2px] text-muted-foreground animate-pulse">
          Đang chuẩn bị dữ liệu...
        </p>
        {Array.from({ length: 5 }, (_, i) => `skel-${i}`).map(key => (
          <Skeleton key={key} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (dataset.type === 'kanji') {
    return <KanjiBookPage userId={userId} dataset={dataset} />
  }

  return <VocabBookPage book={book} userId={userId} dataset={dataset} />
}

function KanjiBookPage({
  userId,
  dataset,
}: {
  userId: string
  dataset: (typeof datasets)[number]
}) {
  return (
    <div>
      <div className="lg:hidden h-[84px]" aria-hidden />
      <div className="sticky top-0 z-10 bg-background px-4 border-b border-border/10">
        <div className="hidden lg:block pt-4">
          <Link
            to="/books"
            className="inline-flex items-center gap-1 text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            ← BOOKS
          </Link>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight leading-none">
                {dataset.title}
              </h1>
              <p className="text-sm text-muted-foreground font-[var(--br-jp-font)] mt-0.5">{dataset.title_vi}</p>
            </div>
            <div className="flex items-center gap-2 mb-0.5">
              {dataset.jlpt_level && (
                <span className="inline-block text-[10px] font-[var(--br-mono-font)] border border-primary text-primary px-1.5 py-0.5">
                  {`N${dataset.jlpt_level}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <BookProgressOverview userId={userId} bookSource={dataset.id} bookType="kanji" />
        <KanjiLessonPanel userId={userId} title="HÁN TỰ THEO BÀI" />
      </div>
    </div>
  )
}

function VocabBookPage({
  book,
  userId,
  dataset,
}: {
  book: string
  userId: string
  dataset: (typeof datasets)[number]
}) {
  const { data: lessons, isLoading } = useLessons(book)

  return (
    <div>
      <div className="lg:hidden h-[84px]" aria-hidden />
      <div className="sticky top-0 z-10 bg-background px-4 border-b border-border/10">
        <div className="hidden lg:block pt-4">
          <Link
            to="/books"
            className="inline-flex items-center gap-1 text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            ← BOOKS
          </Link>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight leading-none">
                {dataset.title}
              </h1>
              <p className="text-sm text-muted-foreground font-[var(--br-jp-font)] mt-0.5">{dataset.title_vi}</p>
            </div>
            <div className="flex items-center gap-2 mb-0.5">
              {dataset.jlpt_level && (
                <span className="inline-block text-[10px] font-[var(--br-mono-font)] border border-primary text-primary px-1.5 py-0.5">
                  {`N${dataset.jlpt_level}`}
                </span>
              )}
              <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
                {`L${dataset.lesson_range[0]}–${dataset.lesson_range[1]}`}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <LessonGrid book={book} bookSource={dataset.id} lessons={lessons} isLoading={isLoading} userId={userId} />
      </div>
    </div>
  )
}

interface Lesson {
  lesson_id: string
  lesson_number: number
  title: string
  vocab_count: number
  book_source: string
}

interface LessonGridProps {
  book: string
  bookSource: string
  lessons?: Lesson[]
  isLoading: boolean
  userId: string
}

function BookProgressOverview({
  userId,
  bookSource,
  bookType = 'vocab',
}: {
  userId: string
  bookSource: string
  bookType?: 'vocab' | 'kanji'
}) {
  const { data: stats } = useBookProgress(userId, bookSource, bookType)
  const now = useMemo(() => new Date().toISOString(), [])

  if (!stats || !userId)
    return null

  const nextReview = stats.nextDueDate ? formatNextReview([stats.nextDueDate], now) : null

  const srsStats: SRSStats = {
    total: stats.total,
    new: stats.newCards,
    learning: stats.learning,
    review: stats.review,
    mature: stats.mature,
  }

  const STAT_ROWS = [
    { count: stats.newCards, label: 'CHƯA HỌC', color: 'text-foreground/50', delay: 0.15 },
    { count: stats.learning, label: 'ĐANG HỌC', color: 'text-warning', delay: 0.21 },
    { count: stats.review, label: 'ÔN TẬP', color: 'text-info', delay: 0.27 },
    { count: stats.mature, label: 'ĐÃ THUỘC', color: 'text-success', delay: 0.33 },
  ]

  return (
    <div className="border border-border/10 border-l-4 border-l-primary bg-card p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          TIẾN ĐỘ TỔNG QUAN
        </p>
        {stats.due > 0 && (
          <span className="inline-block text-[9px] font-[var(--br-mono-font)] bg-destructive text-destructive-foreground px-1.5 py-0.5">
            {stats.due}
            {' '}
            ĐẾN HẠN
          </span>
        )}
      </div>

      <SRSProgressBar stats={srsStats} height="h-2.5" animDelay={0.1} />

      <div className="grid grid-cols-4">
        {STAT_ROWS.map(({ count, label, color, delay }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className={`text-xl font-[var(--br-mono-font)] font-bold leading-none tabular-nums ${color}`}>
              <AnimatedNumber value={count} delay={delay} />
            </span>
            <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 leading-tight tracking-wide mt-0.5">
              {label}
            </span>
          </div>
        ))}
      </div>

      {nextReview && (
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 text-right">
          ôn tiếp:
          {' '}
          {nextReview}
        </p>
      )}
    </div>
  )
}

function LessonGrid({ book, bookSource, lessons, isLoading, userId }: LessonGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="animate-pulse bg-secondary h-24 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 10 }, (_, i) => `skel-${i}`).map(key => (
            <div key={key} className="animate-pulse bg-secondary h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!lessons || lessons.length === 0) {
    return (
      <p className="font-[var(--br-mono-font)] text-muted-foreground text-sm">
        No lessons — run `pnpm run build:dataset`
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <BookProgressOverview userId={userId} bookSource={bookSource} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {lessons.map(lesson => (
          <LessonCard key={lesson.lesson_id} bookId={book} lesson={lesson} userId={userId} />
        ))}
      </div>
    </div>
  )
}

function LessonCard({ bookId, lesson, userId }: { bookId: string, lesson: Lesson, userId: string }) {
  const { data: vocabItems } = useVocabulary(lesson.book_source, lesson.lesson_number, userId)
  const total = vocabItems?.length ?? lesson.vocab_count
  const vocabIds = vocabItems?.map(v => v.vocab_id) ?? []

  const { data: cards } = useUserCards(userId, vocabIds)
  const cardList = cards ? [...cards.values()] : []

  const learningCount = cardList.filter(c => c.scheduled_days < 8).length
  const reviewCount = cardList.filter(c => c.scheduled_days >= 8 && c.scheduled_days < 21).length
  const matureCount = cardList.filter(c => c.scheduled_days >= 21).length

  const srsStats: SRSStats = {
    total,
    new: Math.max(0, total - cardList.length),
    learning: learningCount,
    review: reviewCount,
    mature: matureCount,
  }

  const hasProgress = cardList.length > 0
  const now = useMemo(() => new Date().toISOString(), [])
  const nextReview = hasProgress
    ? formatNextReview(cardList.map(c => c.due), now)
    : null

  return (
    <Link to="/books/$book/$lesson" params={{ book: bookId, lesson: String(lesson.lesson_number).padStart(2, '0') }}>
      <div className="bg-card border border-border/10 transition-colors hover:border-l-4 hover:border-l-primary cursor-pointer h-full">
        <div className="card-body p-4 gap-1">
          <h2 className="font-[var(--br-heading-font)] text-3xl leading-none">
            {String(lesson.lesson_number).padStart(2, '0')}
          </h2>
          {lesson.title
            ? (
                <p className="text-[11px] text-muted-foreground font-[var(--br-jp-font)] leading-snug line-clamp-2">
                  {lesson.title}
                </p>
              )
            : <span className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground/40">—</span>}

          <div className="mt-auto pt-2 flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
                {total}
                {' '}
                TỪ
              </p>
              {hasProgress && (
                <div className="flex gap-2">
                  {matureCount > 0 && (
                    <span className="text-[10px] font-[var(--br-mono-font)] text-success uppercase tabular-nums">
                      {matureCount}
                      {' '}
                      thuộc
                    </span>
                  )}
                  {learningCount > 0 && (
                    <span className="text-[10px] font-[var(--br-mono-font)] text-warning uppercase tabular-nums">
                      {learningCount}
                      {' '}
                      học
                    </span>
                  )}
                </div>
              )}
            </div>
            <SRSProgressBar stats={srsStats} height="h-2" />
            {nextReview && (
              <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 text-right leading-none">
                ôn:
                {' '}
                {nextReview}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
