import {
  LeaderboardHeader,
  LeaderboardList,
  LeaderboardMyRank,
  LeaderboardPodium,
} from '../../components/leaderboard'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import { getWeekBounds } from '../../lib/date-utils'

export default function LeaderboardPage() {
  const { podium, rest, myEntry, isLoading, isError } = useLeaderboard()
  const { weekStart, weekEnd, daysUntilReset } = getWeekBounds()

  if (isLoading) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-3">
        <div className="h-12 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground">Không thể tải bảng xếp hạng.</p>
        <p className="text-sm text-muted-foreground mt-1">Kiểm tra kết nối và thử lại.</p>
      </div>
    )
  }

  if (podium.length === 0) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-6">
        <LeaderboardHeader
          weekStart={weekStart}
          weekEnd={weekEnd}
          daysUntilReset={daysUntilReset}
          isOffline={isError}
        />
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">🏆</p>
          <p className="font-semibold">Chưa có ai ôn tập tuần này.</p>
          <p className="text-sm mt-1">Bạn có thể là #1!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-6 pb-20">
      <LeaderboardHeader
        weekStart={weekStart}
        weekEnd={weekEnd}
        daysUntilReset={daysUntilReset}
        isOffline={isError}
      />
      <LeaderboardPodium entries={podium} />
      <LeaderboardList entries={rest} />
      {myEntry && <LeaderboardMyRank entry={myEntry} />}
    </div>
  )
}
