import type { LeaderboardPeriod } from '../../hooks/useLeaderboard'
import { useState } from 'react'
import {
  LeaderboardHeader,
  LeaderboardList,
  LeaderboardMyRank,
  LeaderboardPodium,
} from '../../components/leaderboard'
import { Button } from '../../components/ui/button'
import { ButtonGroup } from '../../components/ui/button-group'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import { getWeekBounds } from '../../lib/date-utils'

const PERIOD_OPTIONS: { value: LeaderboardPeriod, label: string }[] = [
  { value: 'weekly', label: 'Tuần này' },
  { value: 'monthly', label: 'Tháng này' },
  { value: 'all_time', label: 'Toàn thời gian' },
]

const EMPTY_MESSAGES: Record<LeaderboardPeriod, string> = {
  weekly: 'Chưa có ai ôn tập tuần này.',
  monthly: 'Chưa có ai ôn tập tháng này.',
  all_time: 'Chưa có dữ liệu ôn tập.',
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly')
  const { podium, rest, myEntry, isLoading, isError } = useLeaderboard(period)
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

  const periodTabs = (
    <ButtonGroup className="mb-4 w-full">
      {PERIOD_OPTIONS.map(({ value, label }) => (
        <Button
          key={value}
          variant={period === value ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setPeriod(value)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  )

  if (podium.length === 0) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-6">
        {periodTabs}
        {period === 'weekly' && (
          <LeaderboardHeader
            weekStart={weekStart}
            weekEnd={weekEnd}
            daysUntilReset={daysUntilReset}
            isOffline={isError}
          />
        )}
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">🏆</p>
          <p className="font-semibold">{EMPTY_MESSAGES[period]}</p>
          <p className="text-sm mt-1">Bạn có thể là #1!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-6 pb-20">
      {periodTabs}
      {period === 'weekly' && (
        <LeaderboardHeader
          weekStart={weekStart}
          weekEnd={weekEnd}
          daysUntilReset={daysUntilReset}
          isOffline={isError}
        />
      )}
      <LeaderboardPodium entries={podium} />
      <LeaderboardList entries={rest} />
      {myEntry && <LeaderboardMyRank entry={myEntry} />}
    </div>
  )
}
