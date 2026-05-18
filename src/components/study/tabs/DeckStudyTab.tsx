import type { UnifiedDueStats } from '../../../hooks/useUnifiedDueStats'

import { cn } from '@/lib/utils'
import { ReviewActivityWidget } from '../../analytics/ReviewActivityWidget'
import { CustomDecksStudySection } from '../CustomDecksStudySection'

interface DeckStudyTabProps {
  userId: string
  stats: UnifiedDueStats
}

const STAT_ROWS = [
  { key: 'customDecksDueToday' as const, label: 'ĐẾN HẠN', color: 'text-destructive' },
  { key: 'customDecksLearning' as const, label: 'ĐANG HỌC', color: 'text-warning' },
  { key: 'customDecksReview' as const, label: 'ÔN TẬP', color: 'text-info' },
  { key: 'customDecksMature' as const, label: 'ĐÃ THUỘC', color: 'text-success' },
]

const UPCOMING_ROWS = [
  { key: 'customDecksDueTomorrow' as const, label: 'Ngày mai', color: 'text-info' },
  { key: 'customDecksDueThisWeek' as const, label: 'Tuần này', color: 'text-foreground/50' },
  { key: 'customDecksDue21Days' as const, label: '21 ngày tới', color: 'text-foreground/30' },
]

export function DeckStudyTab({ userId, stats }: DeckStudyTabProps) {
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

      {/* Per-deck list (unchanged behavior) */}
      <CustomDecksStudySection userId={userId} />

      {/* Analytics widget (custom_vocab-scoped) */}
      <ReviewActivityWidget userId={userId} cardType="custom_vocab" />

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
    </div>
  )
}
