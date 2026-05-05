import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useReviewForecast } from '../../hooks/useReviewForecast'

interface ReviewForecastWidgetProps {
  userId: string
}

const MAX_BAR_HEIGHT = 64

export function ReviewForecastWidget({ userId }: ReviewForecastWidgetProps) {
  const { data: forecast, isLoading } = useReviewForecast(userId)

  const totalUpcoming = forecast?.reduce((sum, d) => sum + d.count, 0) ?? 0
  const maxCount = forecast ? Math.max(0, ...forecast.map(d => d.count)) : 0

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
            LỊCH ÔN TẬP
          </p>
          {!isLoading && totalUpcoming > 0 && (
            <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
              {totalUpcoming}
              {' '}
              thẻ / 7 ngày
            </span>
          )}
        </div>

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
                {(forecast ?? []).map((day, i) => {
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
                        className={`w-full ${bgClass} ${day.isToday ? 'border-t-2 border-foreground' : ''}`}
                        style={{ height: barHeight }}
                        initial={{ scaleY: 0, originY: '100%' }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                      />
                      <span
                        className={`text-[9px] font-[var(--br-mono-font)] ${day.isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                      >
                        {day.isToday ? 'HN' : day.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
      </CardContent>
    </Card>
  )
}
