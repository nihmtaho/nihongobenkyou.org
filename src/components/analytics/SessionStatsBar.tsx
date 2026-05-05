import { useReviewStats } from '../../hooks/useReviewStats'

interface SessionStatsBarProps {
  userId: string
}

export function SessionStatsBar({ userId }: SessionStatsBarProps) {
  const { data: stats } = useReviewStats(userId)

  const streak = stats?.streak ?? 0
  const todayCount = stats?.todayCount ?? 0
  const ratingDistribution = stats?.ratingDistribution ?? []
  const total7Days = ratingDistribution.reduce((s, r) => s + r.count, 0)
  const retained = total7Days > 0
    ? (ratingDistribution[2]?.count ?? 0) + (ratingDistribution[3]?.count ?? 0)
    : null
  const retentionPct = retained !== null && total7Days > 0
    ? Math.round((retained / total7Days) * 100)
    : null

  if (!stats)
    return null

  return (
    <div className="flex items-center gap-3 text-[10px] font-[var(--br-mono-font)] uppercase text-foreground/50 tracking-wide">
      <span>
        🔥
        {' '}
        {streak}
        {' '}
        NGÀY
      </span>
      <span className="text-foreground/20">·</span>
      <span>
        HÔM NAY:
        {' '}
        {todayCount}
      </span>
      {retentionPct !== null && (
        <>
          <span className="text-foreground/20">·</span>
          <span>
            NHỚ:
            {' '}
            {retentionPct}
            %
          </span>
        </>
      )}
    </div>
  )
}
