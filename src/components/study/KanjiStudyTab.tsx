import type { KanjiLessonStats } from '../../hooks/useKanjiLessonStats'
import type { LessonStats } from '../../types/study'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'
import { useKanjiLessonStats } from '../../hooks/useKanjiLessonStats'
import { useNextKanjiDue } from '../../hooks/useNextKanjiDue'
import { formatNextReview } from '../../lib/next-review'
import { SRSProgressBar } from '../common/SRSProgressBar'
import { KanjiStudyModal } from '../kanji/KanjiStudyModal'

import { DueCard } from './shared/DueCard'
import { EmptyState } from './shared/EmptyState'
import { NextReviewCard } from './shared/NextReviewCard'
import { SectionLabel } from './shared/SectionLabel'
import { SkeletonRows } from './shared/SkeletonRows'
import { StatPip } from './shared/StatPip'
import { StatsGrid } from './shared/StatsGrid'
import { UnstartedCollapse } from './shared/UnstartedCollapse'

export function KanjiStudyTab({ userId }: { userId: string }) {
  const { data: lessons, isLoading } = useKanjiLessonStats(userId)
  const { data: nextKanjiDue } = useNextKanjiDue(userId)

  const [openModal, setOpenModal] = useState<{
    lessonNum: number
    stats: LessonStats
    type?: 'kanji' | 'vocab'
    dueOnly?: boolean
  } | null>(null)

  const openLesson = openModal

  const activeLessons = lessons?.filter(
    l => l.kanji.learning + l.kanji.review + l.kanji.mature + l.vocab.learning + l.vocab.review + l.vocab.mature > 0,
  ) ?? []
  const unstartedLessons = lessons?.filter(
    l => l.kanji.learning + l.kanji.review + l.kanji.mature + l.vocab.learning + l.vocab.review + l.vocab.mature === 0,
  ) ?? []

  const kanjiTotals = lessons?.reduce(
    (acc, l) => ({
      due: acc.due + l.kanji.due + l.vocab.due,
      new: acc.new + l.kanji.new + l.vocab.new,
      learning: acc.learning + l.kanji.learning + l.vocab.learning,
      review: acc.review + l.kanji.review + l.vocab.review,
      mature: acc.mature + l.kanji.mature + l.vocab.mature,
      studied: acc.studied + l.kanji.learning + l.kanji.review + l.kanji.mature
        + l.vocab.learning + l.vocab.review + l.vocab.mature,
    }),
    { due: 0, new: 0, learning: 0, review: 0, mature: 0, studied: 0 },
  )

  const kanjiCardsDue = lessons?.reduce((acc, l) => acc + l.kanji.due, 0) ?? 0

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
      <StatsGrid
        items={[
          { label: 'ĐẾN HẠN', value: kanjiTotals?.due ?? 0, color: 'text-destructive' },
          { label: 'MỚI', value: kanjiTotals?.new ?? 0, color: 'text-foreground/50' },
          { label: 'ĐANG HỌC', value: kanjiTotals?.learning ?? 0, color: 'text-warning' },
          { label: 'ÔN TẬP', value: kanjiTotals?.review ?? 0, color: 'text-info' },
          { label: 'ĐÃ THUỘC', value: kanjiTotals?.mature ?? 0, color: 'text-success' },
          { label: 'ĐÃ HỌC QUA', value: kanjiTotals?.studied ?? 0, color: 'text-foreground' },
        ]}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <DueCard
          count={kanjiCardsDue}
          label="THẺ HÁN TỰ CẦN ÔN HÔM NAY"
          reviewLink="/kanji/review"
        />
        <NextReviewCard nextDueDate={nextKanjiDue ?? null} />
      </div>

      {isLoading
        ? <SkeletonRows count={4} />
        : (
            <>
              {activeLessons.length > 0 && (
                <div className="mb-4">
                  <SectionLabel label="BÀI ĐANG HỌC" count={activeLessons.length} />
                  <div className="border border-border/10">
                    {activeLessons.map((lesson, i) => (
                      <KanjiLessonRow
                        key={lesson.lessonNumber}
                        lesson={lesson}
                        animDelay={i * 0.04}
                        onOpenModal={(type, stats, dueOnly) => setOpenModal({ lessonNum: lesson.lessonNumber, stats, type, dueOnly })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeLessons.length === 0 && (
                <EmptyState
                  jp="まだ漢字を学習していません"
                  label="Chưa bắt đầu học hán tự"
                  hint="Khám phá danh sách hán tự để bắt đầu ôn tập"
                  cta="KHÁM PHÁ HÁN TỰ"
                  ctaLink="/kanji"
                />
              )}

              {unstartedLessons.length > 0 && activeLessons.length > 0 && (
                <UnstartedCollapse count={unstartedLessons.length} label="BÀI CHƯA HỌC">
                  {unstartedLessons.map(lesson => (
                    <div
                      key={lesson.lessonNumber}
                      className="flex items-center justify-between border-b border-border/10 last:border-b-0 px-4 py-2.5"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-[var(--br-heading-font)] text-sm font-bold uppercase">
                          BÀI
                          {' '}
                          {String(lesson.lessonNumber).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
                          {lesson.kanji.total}
                          {' '}
                          chữ ·
                          {' '}
                          {lesson.vocab.total}
                          {' '}
                          từ
                        </span>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        className="font-[var(--br-mono-font)] min-h-0 h-7"
                        onClick={() =>
                          setOpenModal({
                            lessonNum: lesson.lessonNumber,
                            stats: {
                              total: lesson.kanji.total + lesson.vocab.total,
                              new: lesson.kanji.new + lesson.vocab.new,
                              learning: 0,
                              review: 0,
                              mature: 0,
                            },
                          })}
                      >
                        BẮT ĐẦU
                      </Button>
                    </div>
                  ))}
                </UnstartedCollapse>
              )}
            </>
          )}

      {openLesson && (
        <KanjiStudyModal
          lessonNum={openLesson.lessonNum}
          stats={openLesson.stats}
          type={openLesson.type}
          dueOnly={openLesson.dueOnly}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  )
}

function KanjiLessonRow({
  lesson,
  animDelay,
  onOpenModal,
}: {
  lesson: KanjiLessonStats
  animDelay: number
  onOpenModal: (type: 'kanji' | 'vocab', stats: LessonStats, dueOnly?: boolean) => void
}) {
  const { lessonNumber, kanji, vocab } = lesson
  const totalDue = kanji.due + vocab.due

  return (
    <div
      className={[
        'border-b border-border/10 last:border-b-0 p-3 lg:p-4',
        totalDue > 0 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight">
          BÀI
          {' '}
          {String(lessonNumber).padStart(2, '0')}
        </span>
        {totalDue > 0 && (
          <Badge className="bg-destructive text-destructive-foreground font-[var(--br-mono-font)] text-[10px]">
            {totalDue}
            {' '}
            ĐH
          </Badge>
        )}
      </div>

      {kanji.total > 0 && (
        <KanjiSubRow
          label="単漢字"
          labelVi="Hán tự đơn"
          stats={kanji}
          animDelay={animDelay}
          onOpenModal={() => onOpenModal('kanji', { total: kanji.total, new: kanji.new, learning: kanji.learning, review: kanji.review, mature: kanji.mature })}
          onOpenDue={kanji.due > 0 ? () => onOpenModal('kanji', { total: kanji.total, new: kanji.new, learning: kanji.learning, review: kanji.review, mature: kanji.mature }, true) : undefined}
        />
      )}
      {vocab.total > 0 && (
        <KanjiSubRow
          label="語彙"
          labelVi="Từ vựng hán tự"
          stats={vocab}
          animDelay={animDelay + 0.04}
          onOpenModal={() => onOpenModal('vocab', { total: vocab.total, new: vocab.new, learning: vocab.learning, review: vocab.review, mature: vocab.mature })}
          onOpenDue={vocab.due > 0 ? () => onOpenModal('vocab', { total: vocab.total, new: vocab.new, learning: vocab.learning, review: vocab.review, mature: vocab.mature }, true) : undefined}
        />
      )}
    </div>
  )
}

function KanjiSubRow({
  label,
  labelVi,
  stats,
  animDelay,
  onOpenModal,
  onOpenDue,
}: {
  label: string
  labelVi: string
  stats: KanjiLessonStats['kanji']
  animDelay: number
  onOpenModal: () => void
  onOpenDue?: () => void
}) {
  const { total, new: newCount, learning, review, mature, due, next_due_date } = stats
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const nextReview = due === 0 && next_due_date ? formatNextReview([next_due_date], today) : null

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-none w-[72px]">
        <p className="text-[11px] font-[var(--br-jp-font)] text-foreground/80">{label}</p>
        <p className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground/60">{labelVi}</p>
      </div>
      <div className="flex-1 min-w-0">
        <SRSProgressBar
          stats={{ total, new: newCount, learning, review, mature }}
          height="h-1"
          animDelay={animDelay}
        />
        <div className="flex items-center gap-2 mt-1">
          <StatPip count={learning} label="HỌC" className="text-warning" />
          <StatPip count={review} label="ÔN" className="text-info" />
          <StatPip count={mature} label="THUỘC" className="text-success" />
          {nextReview && (
            <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-foreground/35 tracking-widest ml-auto">
              {nextReview}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 flex-none">
        {due > 0 && (
          <Button
            size="xs"
            className="font-[var(--br-mono-font)] min-h-0 h-7"
            onClick={onOpenDue ?? onOpenModal}
          >
            ÔN (
            {due}
            )
          </Button>
        )}
        <Button
          size="xs"
          variant="outline"
          className="font-[var(--br-mono-font)] min-h-0 h-7"
          onClick={onOpenModal}
        >
          HỌC
        </Button>
      </div>
    </div>
  )
}
