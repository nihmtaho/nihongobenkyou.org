import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useReviewStats } from '../../hooks/useReviewStats'

interface RetentionWidgetProps {
  userId: string
}

const RATING_INDICATOR: Record<string, string> = {
  'text-destructive': 'bg-destructive',
  'text-warning': 'bg-warning',
  'text-success': 'bg-success',
  'text-info': 'bg-info',
}

export function RetentionWidget({ userId }: RetentionWidgetProps) {
  const { data: stats, isLoading } = useReviewStats(userId)

  const total = stats?.ratingDistribution.reduce((sum, r) => sum + r.count, 0) ?? 0
  // ratingDistribution index: 0=Quên, 1=Khó, 2=Ôn(Good), 3=Dễ(Easy)
  const retained = stats
    ? (stats.ratingDistribution[2]?.count ?? 0) + (stats.ratingDistribution[3]?.count ?? 0)
    : 0
  const retentionPct = total > 0 ? Math.round((retained / total) * 100) : null

  return (
    <Card className="p-4">
      <CardContent className="p-0 flex flex-col gap-2">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          TỈ LỆ NHỚ
        </p>

        {isLoading
          ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            )
          : (
              <>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-bold font-[var(--br-mono-font)] leading-none ${
                      retentionPct !== null ? 'text-success' : 'text-muted-foreground'
                    }`}
                  >
                    {retentionPct !== null ? `${retentionPct}%` : '—'}
                  </span>
                  <span className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground uppercase">G+E</span>
                </div>

                <div className="flex flex-col gap-1">
                  {(stats?.ratingDistribution ?? []).map(r => (
                    <div key={r.label} className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-[var(--br-mono-font)] w-7 shrink-0 ${r.color}`}>
                        {r.label}
                      </span>
                      <Progress
                        value={r.pct}
                        className="h-1 flex-1"
                        indicatorClassName={RATING_INDICATOR[r.color]}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
      </CardContent>
    </Card>
  )
}
