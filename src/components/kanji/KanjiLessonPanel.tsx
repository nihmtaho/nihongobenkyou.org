import type { SRSStats } from '../../components/common/SRSProgressBar'
import type { LessonStats } from './KanjiStudyModal'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SRSProgressBar } from '../../components/common/SRSProgressBar'
import { getKanjiLessons } from '../../db/kanji'
import { useKanjiList } from '../../hooks/useKanjiList'
import { useSRS } from '../../hooks/useSRS'
import { formatNextReview } from '../../lib/next-review'
import { KanjiStudyModal } from './KanjiStudyModal'

interface KanjiEntry {
  char: string
  han_viet: string | null
  lesson_number: number | null
  card?: { scheduled_days: number, due: string }
}

interface KanjiLessonPanelProps {
  userId: string
  title?: string
  stickyStats?: boolean
}

export function KanjiLessonPanel({ userId, title, stickyStats = false }: KanjiLessonPanelProps) {
  const { data: allKanji, isLoading } = useKanjiList(userId)
  const { dueCards } = useSRS('kanji', userId)
  const { data: lessonNums } = useQuery({
    queryKey: ['kanji-lessons'],
    queryFn: getKanjiLessons,
    staleTime: Infinity,
  })

  const [studyLesson, setStudyLesson] = useState<({ num: number } & LessonStats) | null>(null)

  const total = allKanji?.length ?? 0
  const studied = allKanji?.filter(k => k.card !== undefined).length ?? 0
  const mature = allKanji?.filter(k => (k.card?.scheduled_days ?? 0) >= 21).length ?? 0
  const due = dueCards.data?.length ?? 0

  const panelSrsStats: SRSStats = {
    total,
    new: Math.max(0, total - studied),
    learning: allKanji?.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) < 8).length ?? 0,
    review: allKanji?.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) >= 8 && (k.card.scheduled_days ?? 0) < 21).length ?? 0,
    mature,
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const panelNextReview = formatNextReview(
    (allKanji ?? []).map(k => k.card?.due).filter((d): d is string => !!d),
    today,
  )

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="p-6 flex flex-col gap-2 py-8 items-center">
        <p className="font-[var(--br-mono-font)] text-sm uppercase text-muted-foreground">Chưa có dữ liệu</p>
        <p className="font-[var(--br-mono-font)] text-xs text-muted-foreground/60">Chạy `pnpm run build:dataset`</p>
      </div>
    )
  }

  const headerContent = (
    <>
      {title && (
        <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          {title}
        </p>
      )}

      {/* SRS progress bar */}
      <SRSProgressBar stats={panelSrsStats} height="h-2" animDelay={0.1} />

      {/* Stats */}
      <div className="grid grid-cols-4 border border-border/10 bg-card">
        {[
          { value: Math.max(0, total - studied), label: 'CHƯA', color: 'text-foreground/50' },
          { value: panelSrsStats.learning, label: 'ĐANG HỌC', color: 'text-warning' },
          { value: panelSrsStats.review, label: 'ÔN TẬP', color: 'text-info' },
          { value: mature, label: 'THUỘC', color: 'text-success' },
        ].map((stat, i, arr) => (
          <div key={stat.label} className={`p-3 text-center ${i < arr.length - 1 ? 'border-r border-border/10' : ''}`}>
            <div className={`text-xl font-[var(--br-mono-font)] font-bold leading-none ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground uppercase mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {panelNextReview && (
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 text-right">
          ôn tiếp:
          {' '}
          {panelNextReview}
        </p>
      )}

      {due > 0 && (
        <Button
          asChild
          size="lg"
          variant="destructive"
          className="w-full bg-destructive text-destructive-foreground font-[var(--br-mono-font)] uppercase text-[11px]"
        >
          <Link to="/study/review" search={{ filter: 'kanji' }}>
            Ôn tập
            {' '}
            {due}
            {' '}
            hán tự đến hạn
          </Link>
        </Button>
      )}
    </>
  )

  return (
    <div className="flex flex-col">
      {stickyStats
        ? (
            <div className="sticky top-0 z-10 bg-background px-6 pt-4 pb-3 border-b border-border/10 flex flex-col gap-3">
              {headerContent}
            </div>
          )
        : (
            <div className="px-6 pt-4 pb-3 flex flex-col gap-3">
              {headerContent}
            </div>
          )}

      {/* Lesson accordion */}
      <div className="px-6 py-4 flex flex-col gap-1">
        {(lessonNums ?? []).map((num, idx) => (
          <LessonAccordionRow
            key={num}
            lessonNum={num}
            rowIndex={idx}
            kanjiInLesson={(allKanji as KanjiEntry[] | undefined)?.filter(k => k.lesson_number === num) ?? []}
            onStudy={stats => setStudyLesson({ num, ...stats })}
          />
        ))}
      </div>

      {/* Study mode picker modal — rendered once at panel level to avoid z-index issues */}
      {studyLesson !== null && (
        <KanjiStudyModal
          lessonNum={studyLesson.num}
          stats={{ total: studyLesson.total, new: studyLesson.new, learning: studyLesson.learning, review: studyLesson.review, mature: studyLesson.mature }}
          onClose={() => setStudyLesson(null)}
        />
      )}
    </div>
  )
}

function tileStatusColor(intervalDays: number): string {
  if (intervalDays >= 21)
    return 'bg-success'
  if (intervalDays >= 8)
    return 'bg-info'
  return 'bg-warning'
}

function LessonAccordionRow({
  lessonNum,
  kanjiInLesson,
  rowIndex,
  onStudy,
}: {
  lessonNum: number
  kanjiInLesson: KanjiEntry[]
  rowIndex: number
  onStudy: (stats: { total: number, new: number, learning: number, review: number, mature: number }) => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const total = kanjiInLesson.length
  const studied = kanjiInLesson.filter(k => k.card !== undefined).length
  const mature = kanjiInLesson.filter(k => (k.card?.scheduled_days ?? 0) >= 21).length
  const learning = kanjiInLesson.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) < 8).length
  const review = kanjiInLesson.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) >= 8 && (k.card.scheduled_days ?? 0) < 21).length

  const srsStats: SRSStats = {
    total,
    new: Math.max(0, total - studied),
    learning,
    review,
    mature,
  }

  const animDelay = Math.min(rowIndex * 0.03, 0.3)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const nextReview = formatNextReview(
    kanjiInLesson.map(k => k.card?.due).filter((d): d is string => !!d),
    today,
  )

  return (
    <div className="border border-border/10 bg-card">
      <div
        role="button"
        tabIndex={0}
        className="w-full px-3 pt-2.5 pb-2 text-left hover:border-l-4 hover:border-l-primary transition-all cursor-pointer"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(o => !o)}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-[var(--br-heading-font)] text-base uppercase tracking-tight shrink-0">
              Bài
              {' '}
              {String(lessonNum).padStart(2, '0')}
            </span>
            <span className="font-[var(--br-mono-font)] text-[10px] text-muted-foreground uppercase shrink-0">
              {total}
              {' '}
              hán tự
            </span>
            {nextReview && (
              <span className="font-[var(--br-mono-font)] text-[9px] uppercase text-foreground/40 truncate">
                · ôn:
                {' '}
                {nextReview}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="xs"
              aria-label="Học bài này"
              className="text-[10px] font-[var(--br-mono-font)] uppercase"
              onClick={(e) => {
                e.stopPropagation()
                onStudy({ total, new: Math.max(0, total - studied), learning, review, mature })
              }}
            >
              Học
            </Button>
            <span className="font-[var(--br-mono-font)] text-[10px] text-muted-foreground">{open ? '▲' : '▼'}</span>
          </div>
        </div>
        <SRSProgressBar stats={srsStats} height="h-1.5" animDelay={animDelay} />
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border/10">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {kanjiInLesson.map(item => (
              <div
                key={item.char}
                role="button"
                tabIndex={0}
                className="flex flex-col items-center gap-1 bg-background border border-border/10 p-2 cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate({ to: '/kanji/$char', params: { char: item.char } })}
                onKeyDown={e => e.key === 'Enter' && navigate({ to: '/kanji/$char', params: { char: item.char } })}
              >
                <span className="text-2xl font-bold leading-none" style={{ fontFamily: 'var(--br-jp-font)' }}>
                  {item.char}
                </span>
                <span className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground truncate w-full text-center">
                  {item.han_viet ?? '—'}
                </span>
                {item.card !== undefined && (
                  <span className={`w-1.5 h-1.5 ${tileStatusColor(item.card.scheduled_days ?? 0)}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
