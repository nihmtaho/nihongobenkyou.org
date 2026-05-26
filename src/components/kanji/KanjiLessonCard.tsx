import type { JSX } from 'react'
import type { SRSStats } from '../common/SRSProgressBar'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { SRSProgressBar } from '../../components/common/SRSProgressBar'

interface KanjiEntry {
  char: string
  han_viet: string | null
  card?: { scheduled_days: number, due: string }
}

interface KanjiLessonCardProps {
  lessonNum: number
  kanjiList: KanjiEntry[]
  rowIndex: number
  expanded: boolean
  onToggleExpand: () => void
  onStudy: (stats: { total: number, learning: number, review: number, mature: number }) => void
  kanjiListExpanded?: JSX.Element
}

export function KanjiLessonCard({
  lessonNum,
  kanjiList,
  rowIndex,
  expanded,
  onToggleExpand,
  onStudy,
  kanjiListExpanded,
}: KanjiLessonCardProps) {
  const total = kanjiList.length
  const studied = kanjiList.filter(k => k.card !== undefined).length
  const mature = kanjiList.filter(k => (k.card?.scheduled_days ?? 0) >= 21).length
  const learning = kanjiList.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) < 8).length
  const review = kanjiList.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) >= 8 && (k.card.scheduled_days ?? 0) < 21).length

  const srsStats: SRSStats = {
    total,
    new: Math.max(0, total - studied),
    learning,
    review,
    mature,
  }

  const animDelay = Math.min(rowIndex * 0.03, 0.3)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-[var(--br-heading-font)] text-3xl leading-none">
            {String(lessonNum).padStart(2, '0')}
          </h2>
          <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
            {total}
            {' '}
            hán tự
          </p>
          {expanded && kanjiListExpanded && (
            <div className="mt-1">
              {kanjiListExpanded}
            </div>
          )}
        </div>
        <Button
          size="xs"
          aria-label="Học bài này"
          className="text-[10px] font-[var(--br-mono-font)] uppercase shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onStudy({ total, learning, review, mature })
          }}
        >
          Học
        </Button>
      </div>
      <SRSProgressBar stats={srsStats} height="h-1.5" animDelay={animDelay} />
      <Button
        size="xs"
        variant="ghost"
        className="text-[10px] font-[var(--br-mono-font)] uppercase shrink-0"
        onClick={onToggleExpand}
      >
        {expanded ? 'Thu gọn' : 'Mở rộng'}
      </Button>
    </div>
  )
}

export function KanjiLessonCardExpanded({
  lessonNum,
  kanjiList,
  onStudy,
}: {
  lessonNum: number
  kanjiList: KanjiEntry[]
  onStudy: (stats: { total: number, learning: number, review: number, mature: number }) => void
}) {
  const navigate = useNavigate()
  const total = kanjiList.length
  const studied = kanjiList.filter(k => k.card !== undefined).length
  const mature = kanjiList.filter(k => (k.card?.scheduled_days ?? 0) >= 21).length
  const learning = kanjiList.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) < 8).length
  const review = kanjiList.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) >= 8 && (k.card.scheduled_days ?? 0) < 21).length

  const srsStats: SRSStats = {
    total,
    new: Math.max(0, total - studied),
    learning,
    review,
    mature,
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-[var(--br-heading-font)] text-3xl leading-none">
            {String(lessonNum).padStart(2, '0')}
          </h2>
          <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
            {total}
            {' '}
            hán tự
          </p>
        </div>
        <Button
          size="xs"
          aria-label="Học bài này"
          className="text-[10px] font-[var(--br-mono-font)] uppercase shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onStudy({ total, learning, review, mature })
          }}
        >
          Học
        </Button>
      </div>
      <SRSProgressBar stats={srsStats} height="h-1.5" />
      <Button
        size="xs"
        variant="ghost"
        className="text-[10px] font-[var(--br-mono-font)] uppercase shrink-0"
        onClick={() => navigate({ to: '/kanji/lesson/$lesson', params: { lesson: String(lessonNum) } })}
      >
        Quay lại bài
      </Button>
    </div>
  )
}
