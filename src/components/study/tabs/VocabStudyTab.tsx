import type { UnifiedDueStats } from '../../../hooks/useUnifiedDueStats'

import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStudySessionStore } from '../../../stores/studySessionStore'
import { ReviewActivityWidget } from '../../analytics/ReviewActivityWidget'

interface VocabStudyTabProps {
  userId: string
  stats: UnifiedDueStats
}

const STAT_ROWS = [
  { key: 'vocabDue' as const, label: 'ĐẾN HẠN', color: 'text-destructive' },
  { key: 'vocabLearning' as const, label: 'ĐANG HỌC', color: 'text-warning' },
  { key: 'vocabReview' as const, label: 'ÔN TẬP', color: 'text-info' },
  { key: 'vocabMature' as const, label: 'ĐÃ THUỘC', color: 'text-success' },
]

const UPCOMING_ROWS = [
  { key: 'vocabDueTomorrow' as const, label: 'Ngày mai', color: 'text-info' },
  { key: 'vocabDueThisWeek' as const, label: 'Tuần này', color: 'text-foreground/50' },
  { key: 'vocabDue21Days' as const, label: '21 ngày tới', color: 'text-foreground/30' },
]

export function VocabStudyTab({ userId, stats }: VocabStudyTabProps) {
  const navigate = useNavigate()
  const clearSession = useStudySessionStore(s => s.clearSession)
  const dueCount = stats.vocabDue + (stats.kanjiVocabDue ?? 0)

  function startReview() {
    clearSession()
    navigate({ to: '/study/review', search: { filter: 'vocab' } })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {STAT_ROWS.map(({ key, label, color }) => (
          <div key={label} className="bg-card border border-border/10 p-2 text-center">
            <p className={cn('text-xl font-black', color)}>{stats[key]}</p>
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
        {dueCount > 0 ? `▶ ÔN TẬP TỪ VỰNG (${dueCount})` : '✓ ĐÃ ÔN TẬP XONG'}
      </Button>

      {dueCount === 0 && (
        <Button
          size="xl"
          variant="ghost"
          className="w-full font-[var(--br-heading-font)] uppercase tracking-wide"
          onClick={startReview}
        >
          ▶ TỰ ÔN (free)
        </Button>
      )}

      {/* Analytics widget (vocab-scoped) */}
      <ReviewActivityWidget userId={userId} cardType="vocab" />

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
              <span className={cn('font-bold text-lg', color)}>{stats[key]}</span>
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
