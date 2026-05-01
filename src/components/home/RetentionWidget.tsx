import { useReviewStats } from '../../hooks/useReviewStats'

interface RetentionWidgetProps {
  userId: string
}

const RATING_BAR_BG: Record<string, string> = {
  'text-error': 'bg-error',
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
    <div className="card bg-base-200 border border-base-content/10 p-4 flex flex-col gap-2">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
        TỈ LỆ NHỚ
      </p>

      {isLoading
        ? (
            <div className="flex flex-col gap-2">
              <div className="skeleton h-8 w-14" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-full" />
            </div>
          )
        : (
            <>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-3xl font-bold font-[var(--br-mono-font)] leading-none ${
                    retentionPct !== null ? 'text-success' : 'text-neutral'
                  }`}
                >
                  {retentionPct !== null ? `${retentionPct}%` : '—'}
                </span>
                <span className="text-[9px] font-[var(--br-mono-font)] text-neutral uppercase">G+E</span>
              </div>

              <div className="flex flex-col gap-1">
                {(stats?.ratingDistribution ?? []).map(r => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-[var(--br-mono-font)] w-7 shrink-0 ${r.color}`}>
                      {r.label}
                    </span>
                    <div className="flex-1 bg-base-300 h-1">
                      <div
                        className={`${RATING_BAR_BG[r.color] ?? 'bg-neutral'} h-full`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
    </div>
  )
}
