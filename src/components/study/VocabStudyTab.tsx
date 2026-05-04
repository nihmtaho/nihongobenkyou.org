import type { LessonVocabStats } from '../../hooks/useVocabLessonStats'
import type { StudyMode, TypeInputSubMode } from '../../types/study'
import { useQueries } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLaunchVocabSession } from '../../hooks/useLaunchVocabSession'
import { useNextVocabDue } from '../../hooks/useNextVocabDue'
import { useStreak } from '../../hooks/useStreak'
import { fetchVocabLessonStats } from '../../hooks/useVocabLessonStats'
import { datasets } from '../../lib/datasets.config'
import { formatNextReview } from '../../lib/next-review'
import { ActiveDeckVocabSection } from '../active-deck/ActiveDeckSection'
import { SRSProgressBar } from '../common/SRSProgressBar'
import { DueCard } from './shared/DueCard'
import { EmptyState } from './shared/EmptyState'
import { NextReviewCard } from './shared/NextReviewCard'
import { SectionLabel } from './shared/SectionLabel'
import { SkeletonRows } from './shared/SkeletonRows'
import { StatPip } from './shared/StatPip'
import { StatsGrid } from './shared/StatsGrid'
import { VocabStudyModal } from './VocabStudyModal'

export function VocabStudyTab({ userId }: { userId: string }) {
  const enabledBooks = datasets.filter(d => d.enabled)

  const bookQueries = useQueries({
    queries: enabledBooks.map(book => ({
      queryKey: ['vocab-lesson-stats', userId, book.id],
      queryFn: () => fetchVocabLessonStats(userId, book.id),
      staleTime: 0,
      enabled: !!userId,
    })),
  })

  const isLoading = bookQueries.some(q => q.isLoading)

  const { data: nextDueDate } = useNextVocabDue(userId)
  const { data: streak } = useStreak(userId)
  const launchSession = useLaunchVocabSession(userId)
  const [lessonsOpen, setLessonsOpen] = useState(true)

  const [activeModal, setActiveModal] = useState<{
    bookId: string
    lesson: LessonVocabStats
    context: 'all' | 'due'
  } | null>(null)

  // Capture stable reference before JSX render to avoid stale closure in onLaunch
  const modal = activeModal

  const bookGroups = enabledBooks
    .map((book, i) => {
      const activeLessons = (bookQueries[i]?.data ?? []).filter(
        l => l.learning + l.review + l.mature > 0,
      )
      return { book, activeLessons }
    })
    .filter(g => g.activeLessons.length > 0)

  const allLessons = bookQueries.flatMap(q => q.data ?? [])
  const totals = allLessons.reduce(
    (acc, l) => ({
      due: acc.due + l.due,
      new: acc.new + l.new,
      learning: acc.learning + l.learning,
      review: acc.review + l.review,
      mature: acc.mature + l.mature,
      studied: acc.studied + l.learning + l.review + l.mature,
    }),
    { due: 0, new: 0, learning: 0, review: 0, mature: 0, studied: 0 },
  )

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
      {/* Stats row */}
      <StatsGrid
        items={[
          { label: 'ĐẾN HẠN', value: totals.due, color: 'text-destructive' },
          { label: 'MỚI', value: totals.new, color: 'text-foreground/50' },
          { label: 'ĐANG HỌC', value: totals.learning, color: 'text-warning' },
          { label: 'ÔN TẬP', value: totals.review, color: 'text-info' },
          { label: 'ĐÃ THUỘC', value: totals.mature, color: 'text-success' },
          { label: 'ĐÃ HỌC QUA', value: totals.studied, color: 'text-foreground' },
        ]}
        isLoading={isLoading}
      />

      {/* Action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <DueCard
          count={totals.due}
          label="THẺ TỪ VỰNG CẦN ÔN HÔM NAY"
          reviewLink="/srs"
          streak={streak?.current_streak ?? 0}
        />
        <NextReviewCard nextDueDate={nextDueDate ?? null} />
      </div>

      <ActiveDeckVocabSection userId={userId} />

      <div className="border-t border-border/20 mt-2" />

      <button
        type="button"
        onClick={() => setLessonsOpen(v => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-secondary hover:bg-secondary/80 transition-colors"
      >
        {lessonsOpen
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="font-[var(--br-mono-font)] text-[10px] uppercase tracking-[3px] text-muted-foreground">
          BÀI HỌC
        </span>
      </button>

      {/* Lessons grouped by book */}
      {lessonsOpen && (
        isLoading
          ? <SkeletonRows count={4} />
          : bookGroups.length > 0
            ? bookGroups.map(({ book, activeLessons }) => (
                <div key={book.id} className="mb-6">
                  <SectionLabel label={book.title_vi} count={activeLessons.length} />
                  <div className="border border-border/10">
                    {activeLessons.map((lesson, i) => (
                      <LessonVocabRow
                        key={lesson.lesson_number}
                        lesson={lesson}
                        animDelay={i * 0.04}
                        onReview={() => setActiveModal({ bookId: book.id, lesson, context: 'due' })}
                        onStudy={() => setActiveModal({ bookId: book.id, lesson, context: 'all' })}
                      />
                    ))}
                  </div>
                </div>
              ))
            : (
                <EmptyState
                  jp="まだ学習を始めていません"
                  label="Chưa bắt đầu học bài nào"
                  hint="Chọn một bài học để bắt đầu ôn tập với hệ thống SRS"
                  cta="KHÁM PHÁ BÀI HỌC"
                  ctaLink="/books"
                />
              )
      )}

      {modal && (
        <VocabStudyModal
          title={`Bài ${String(modal.lesson.lesson_number).padStart(2, '0')}`}
          {...(modal.context === 'due'
            ? { context: 'due' as const, dueCount: modal.lesson.due }
            : { context: 'all' as const })}
          stats={{
            total: modal.lesson.vocab_count,
            new: modal.lesson.new,
            learning: modal.lesson.learning,
            review: modal.lesson.review,
            mature: modal.lesson.mature,
          }}
          onLaunch={(mode: StudyMode, subMode?: TypeInputSubMode, order?: 'random' | 'sequential') => {
            setActiveModal(null)
            launchSession(modal.bookId, modal.lesson.lesson_number, modal.context === 'due', mode, subMode, order, 'vocab')
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}

function LessonVocabRow({
  lesson,
  animDelay,
  onReview,
  onStudy,
}: {
  lesson: LessonVocabStats
  animDelay: number
  onReview: () => void
  onStudy: () => void
}) {
  const { lesson_number, vocab_count, new: newCount, learning, review, mature, due, next_due_date } = lesson
  const studied = learning + review + mature
  const pctComplete = vocab_count > 0 ? Math.round((studied / vocab_count) * 100) : 0
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const nextReview = due === 0 && next_due_date ? formatNextReview([next_due_date], today) : null

  return (
    <div
      className={[
        'border-b border-border/10 last:border-b-0 p-3 lg:p-4',
        due > 0 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="font-[var(--br-heading-font)] text-base font-bold uppercase tracking-tight">
            BÀI
            {' '}
            {String(lesson_number).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
            {vocab_count}
            {' '}
            từ ·
            {' '}
            {pctComplete}
            %
          </span>
        </div>
        {due > 0
          ? (
              <Badge className="bg-destructive text-destructive-foreground font-[var(--br-mono-font)] text-[10px]">
                {due}
                {' '}
                ĐH
              </Badge>
            )
          : nextReview && (
            <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-foreground/35 tracking-widest">
              ÔN SAU
              {' '}
              {nextReview}
            </span>
          )}
      </div>

      <SRSProgressBar
        stats={{ total: vocab_count, new: newCount, learning, review, mature }}
        height="h-1.5"
        animDelay={animDelay}
      />

      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex gap-3">
          <StatPip count={learning} label="HỌC" className="text-warning" />
          <StatPip count={review} label="ÔN" className="text-info" />
          <StatPip count={mature} label="THUỘC" className="text-success" />
        </div>
        <div className="flex gap-1.5">
          {due > 0 && (
            <Button
              size="xs"
              className="font-[var(--br-mono-font)] min-h-0 h-7"
              onClick={onReview}
            >
              ÔN TẬP (
              {due}
              )
            </Button>
          )}
          <Button
            size="xs"
            variant="outline"
            className="font-[var(--br-mono-font)] min-h-0 h-7"
            onClick={onStudy}
          >
            TỰ HỌC
          </Button>
        </div>
      </div>
    </div>
  )
}
