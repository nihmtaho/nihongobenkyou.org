import type { SRSStats } from '../../components/common/SRSProgressBar'
import { createFileRoute, Link } from '@tanstack/react-router'
import { SRSProgressBar } from '../../components/common/SRSProgressBar'
import { useBookProgress } from '../../hooks/useBookProgress'
import { datasets } from '../../lib/datasets.config'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/books/')({
  component: BooksPage,
})

type Dataset = (typeof datasets)[number]

function BooksPage() {
  const enabled = datasets.filter(d => d.enabled)
  const userId = useAuthStore(s => s.userId) ?? ''

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight lg:hidden">
        BOOKS
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {enabled.map(dataset => (
          <BookCard key={dataset.id} dataset={dataset} userId={userId} />
        ))}
      </div>
    </div>
  )
}

function BookCard({ dataset, userId }: { dataset: Dataset, userId: string }) {
  const { data: stats } = useBookProgress(userId, dataset.id)

  const srsStats: SRSStats | null = stats
    ? {
        total: stats.total,
        new: stats.newCards,
        learning: stats.learning,
        review: stats.review,
        mature: stats.mature,
      }
    : null

  const hasProgress = srsStats !== null
    && (srsStats.learning > 0 || srsStats.review > 0 || srsStats.mature > 0)

  return (
    <Link to="/books/$book" params={{ book: dataset.id }}>
      <div className="bg-card border border-border/10 transition-colors hover:border-l-4 hover:border-l-primary cursor-pointer">
        <div className="card-body p-4 gap-2">
          <div className="flex gap-1 flex-wrap">
            {dataset.jlpt_level && (
              <span className="inline-block text-[10px] font-[var(--br-mono-font)] border border-primary text-primary px-1.5 py-0.5">
                #N
                {dataset.jlpt_level}
              </span>
            )}
            <span className="inline-block text-[10px] font-[var(--br-mono-font)] border border-border text-muted-foreground px-1.5 py-0.5">
              #
              {dataset.type}
            </span>
          </div>
          <h2 className="card-title font-[var(--br-heading-font)] text-xl uppercase tracking-tight leading-tight">
            {dataset.title}
          </h2>
          <p className="text-sm text-muted-foreground font-[var(--br-jp-font)]">{dataset.title_vi}</p>
          <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
            LESSONS
            {' '}
            {dataset.lesson_range[0]}
            –
            {dataset.lesson_range[1]}
          </p>

          {srsStats && (
            <div className="flex flex-col gap-1.5 mt-1">
              <SRSProgressBar stats={srsStats} height="h-1.5" />
              {hasProgress && (
                <div className="flex gap-3">
                  {srsStats.learning > 0 && (
                    <span className="text-[9px] font-[var(--br-mono-font)] text-warning uppercase tabular-nums">
                      {srsStats.learning}
                      {' '}
                      học
                    </span>
                  )}
                  {srsStats.review > 0 && (
                    <span className="text-[9px] font-[var(--br-mono-font)] text-info uppercase tabular-nums">
                      {srsStats.review}
                      {' '}
                      ôn
                    </span>
                  )}
                  {srsStats.mature > 0 && (
                    <span className="text-[9px] font-[var(--br-mono-font)] text-success uppercase tabular-nums">
                      {srsStats.mature}
                      {' '}
                      thuộc
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
