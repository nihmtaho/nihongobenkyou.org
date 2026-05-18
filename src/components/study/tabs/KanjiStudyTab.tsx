import type { UnifiedDueStats } from '../../../hooks/useUnifiedDueStats'

import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ReviewActivityWidget } from '../../analytics/ReviewActivityWidget'

interface KanjiStudyTabProps {
  userId: string
  stats: UnifiedDueStats
}

const STAT_ROWS = [
  { key: 'kanjiDue' as const, label: 'ĐẾN HẠN', color: 'text-destructive' },
  { key: 'kanjiLearning' as const, label: 'ĐANG HỌC', color: 'text-warning' },
  { key: 'kanjiReview' as const, label: 'ÔN TẬP', color: 'text-info' },
  { key: 'kanjiMature' as const, label: 'ĐÃ THUỘC', color: 'text-success' },
]

const UPCOMING_ROWS = [
  { key: 'kanjiDueTomorrow' as const, label: 'Ngày mai', color: 'text-info' },
  { key: 'kanjiDueThisWeek' as const, label: 'Tuần này', color: 'text-foreground/50' },
  { key: 'kanjiDue21Days' as const, label: '21 ngày tới', color: 'text-foreground/30' },
]

export function KanjiStudyTab({ userId, stats }: KanjiStudyTabProps) {
  const navigate = useNavigate()
  const dueCount = stats.kanjiDue

  function startReview() {
    navigate({ to: '/study/review', search: { filter: 'kanji' } })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {STAT_ROWS.map(({ key, label, color }) => (
          <div key={label} className="bg-card border border-border/10 p-2 text-center">
            <p className={`text-xl font-black ${color}`}>{stats[key]}</p>
            <p className="text-[8px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button
        size="xl"
        className="w-full font-[var(--br-heading-font)] uppercase tracking-wide"
        onClick={startReview}
        disabled={dueCount === 0}
      >
        {dueCount > 0 ? `▶ ÔN TẬP KANJI (${dueCount})` : '✓ ĐÃ ÔN TẬP XONG'}
      </Button>

      {/* Analytics widget (kanji-scoped) */}
      <ReviewActivityWidget userId={userId} cardType="kanji" />

      {/* Upcoming due */}
      <div className="flex flex-col gap-2">
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          SẮP ĐẾN HẠN
        </p>
        {UPCOMING_ROWS
          .filter(({ key }) => stats[key] > 0)
          .map(({ key, label, color }) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 border border-border/10">
              <span className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">
                {label}
              </span>
              <span className={`font-bold text-lg ${color}`}>{stats[key]}</span>
            </div>
          ))}
      </div>

      {/* Free study link */}
      <div className="border-t border-border/10 pt-4">
        <Link
          to="/books"
          className="flex items-center justify-between px-3 py-3 border border-border/10 hover:border-border/30 transition-colors"
        >
          <span className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
            TỰ HỌC THEO BÀI
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
      </div>
    </div>
  )
}
