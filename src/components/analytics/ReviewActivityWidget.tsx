import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useReviewStats } from '../../hooks/useReviewStats'

interface ReviewActivityWidgetProps {
  userId: string
  cardType?: 'vocab' | 'kanji' | 'custom_vocab'
}

const TODAY = new Date().toISOString().slice(0, 10)

const RATING_BAR_COLORS: Record<string, string> = {
  'text-destructive': 'bg-destructive',
  'text-warning': 'bg-warning',
  'text-success': 'bg-success',
  'text-info': 'bg-info',
}

export function ReviewActivityWidget({ userId, cardType }: ReviewActivityWidgetProps) {
  const { data: stats, isLoading } = useReviewStats(userId, cardType)

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
            CHI TIẾT ÔN TẬP
          </p>
          {stats && (
            <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
              TỔNG
              {' '}
              {stats.totalCount}
              {' '}
              · THÁNG NÀY
              {' '}
              {stats.monthCount}
            </span>
          )}
        </div>

        {/* Stat chips row */}
        <div className="grid grid-cols-5 gap-1.5">
          <StatChip
            icon="◉"
            iconColor="text-destructive"
            label="STREAK"
            isLoading={isLoading}
            value={stats ? `${stats.streak}` : '0'}
            unit="ngày"
          />
          <StatChip
            icon="◫"
            iconColor="text-info"
            label="HÔM NAY"
            isLoading={isLoading}
            value={stats ? `${stats.todayCount}` : '0'}
            unit="lượt"
          />
          <StatChip
            icon="▦"
            iconColor="text-success"
            label="TUẦN NÀY"
            isLoading={isLoading}
            value={stats ? `${stats.weekCount}` : '0'}
            unit="lượt"
          />
          <StatChip
            icon="◷"
            iconColor="text-warning"
            label="TB/NGÀY"
            isLoading={isLoading}
            value={stats ? `${stats.avgPerDay}` : '0'}
            unit="lượt"
          />
          <StatChip
            icon="◎"
            iconColor="text-primary"
            label="ĐÃ HỌC"
            isLoading={isLoading}
            value={stats ? `${stats.totalCount}` : '0'}
            unit="thẻ"
          />
        </div>

        {/* Bottom: dot grid + rating distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivityDotGrid stats={stats} isLoading={isLoading} />
          <RatingDistribution stats={stats} isLoading={isLoading} />
        </div>
      </CardContent>
    </Card>
  )
}

function StatChip({
  icon,
  iconColor,
  label,
  value,
  unit,
  isLoading,
}: {
  icon: string
  iconColor: string
  label: string
  value: string
  unit: string
  isLoading: boolean
}) {
  return (
    <div className="bg-secondary/50 border border-border/10 p-2 flex flex-col gap-1">
      <span className={`text-[11px] font-[var(--br-mono-font)] ${iconColor} flex items-center gap-1`}>
        <span>{icon}</span>
        <span className="text-muted-foreground text-[9px] uppercase tracking-wider">{label}</span>
      </span>
      {isLoading
        ? <Skeleton className="h-4 w-8" />
        : (
            <p className="text-base font-bold font-[var(--br-mono-font)] leading-none">
              {value}
              {' '}
              <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
            </p>
          )}
    </div>
  )
}

const MAX_BAR_HEIGHT = 64

function ActivityDotGrid({
  stats,
  isLoading,
}: {
  stats: ReturnType<typeof useReviewStats>['data']
  isLoading: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-2">
        7 NGÀY GẦN NHẤT
      </p>
      {isLoading
        ? (
            <div className="flex gap-1.5">
              {Array.from({ length: 7 }, (_, i) => i).map(i => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <Skeleton className="w-full h-8" />
                  <Skeleton className="h-2 w-4" />
                </div>
              ))}
            </div>
          )
        : (
            <div className="flex gap-1.5 items-end" style={{ height: MAX_BAR_HEIGHT + 32 }}>
              {(stats?.last7Days ?? []).map((day, i) => {
                const isToday = day.date === TODAY
                const maxCount = stats?.maxDayCount ?? 0
                const barHeight = maxCount > 0
                  ? Math.max(4, Math.round((day.count / maxCount) * MAX_BAR_HEIGHT))
                  : 4
                const intensity = maxCount > 0 ? day.count / maxCount : 0
                const bgClass = day.count === 0
                  ? 'bg-secondary'
                  : intensity > 0.7
                    ? 'bg-primary'
                    : intensity > 0.3
                      ? 'bg-primary/60'
                      : 'bg-primary/30'

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span
                      className={`text-[9px] font-[var(--br-mono-font)] font-bold leading-none ${
                        day.count > 0 ? 'text-foreground/70' : 'invisible'
                      }`}
                    >
                      {day.count > 0 ? day.count : '0'}
                    </span>
                    <motion.div
                      className={`w-full ${bgClass} ${isToday ? 'border-t-2 border-foreground' : ''}`}
                      style={{ height: barHeight }}
                      initial={{ scaleY: 0, originY: '100%' }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                    />
                    <span
                      className={`text-[9px] font-[var(--br-mono-font)] ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                    >
                      {day.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}

function RatingDistribution({
  stats,
  isLoading,
}: {
  stats: ReturnType<typeof useReviewStats>['data']
  isLoading: boolean
}) {
  const total7Days = stats?.ratingDistribution.reduce((a, b) => a + b.count, 0) ?? 0

  return (
    <div>
      <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mb-2">
        PHÂN BỔ ĐÁNH GIÁ
        {total7Days > 0 && (
          <span className="ml-1 text-muted-foreground/60">
            (
            {total7Days}
            {' '}
            lượt)
          </span>
        )}
      </p>
      {isLoading
        ? (
            <div className="flex flex-col gap-1.5">
              {['a', 'b', 'c', 'd'].map(k => <Skeleton key={k} className="h-4 w-full" />)}
            </div>
          )
        : (
            <div className="flex flex-col gap-1.5">
              {(stats?.ratingDistribution ?? []).map((r, i) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className={`text-[10px] font-[var(--br-mono-font)] w-8 ${r.color}`}>
                    {r.label}
                  </span>
                  <div className="flex-1 bg-secondary h-1.5">
                    <motion.div
                      className={`${RATING_BAR_COLORS[r.color] ?? 'bg-neutral'} h-full`}
                      style={{ width: `${r.pct}%` }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                    />
                  </div>
                  <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground w-12 text-right">
                    {r.count}
                    {' '}
                    (
                    {r.pct}
                    %)
                  </span>
                </div>
              ))}
            </div>
          )}
    </div>
  )
}
