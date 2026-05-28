interface Props {
  weekStart: string
  weekEnd: string
  daysUntilReset: number
  isStale: boolean
}

function fmtShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${Number(d)}/${Number(m)}`
}

export function LeaderboardHeader({ weekStart, weekEnd, daysUntilReset, isStale }: Props) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">🏆 Bảng Xếp Hạng</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {fmtShort(weekStart)}
          {' '}
          –
          {' '}
          {fmtShort(weekEnd)}
          {' · '}
          Reset sau
          {' '}
          {daysUntilReset}
          {' '}
          ngày
        </p>
      </div>
      {isStale && (
        <span className="text-xs border border-warning text-warning rounded px-2 py-0.5">
          Đang offline
        </span>
      )}
    </div>
  )
}
