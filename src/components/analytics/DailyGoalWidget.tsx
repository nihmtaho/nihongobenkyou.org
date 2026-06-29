import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDailyGoal } from '../../hooks/useDailyGoal'
import { useTranslation } from '../../hooks/useTranslation'
import { getLastNDates, getToday } from '../../lib/date-utils'
import { useSettingsStore } from '../../stores/settingsStore'

interface DailyGoalWidgetProps {
  userId: string
}

export function DailyGoalWidget({ userId }: DailyGoalWidgetProps) {
  const { t } = useTranslation()
  const lastConfettiDate = useSettingsStore(s => s.lastConfettiDate)
  const setLastConfettiDate = useSettingsStore(s => s.setLastConfettiDate)
  const confettiRef = useRef<HTMLDivElement>(null)
  const confettiFiredRef = useRef(false)

  const { data, isLoading } = useDailyGoal(userId)

  // Fire confetti once per day on first completion.
  // confettiFiredRef breaks the re-render cycle: setLastConfettiDate updates
  // lastConfettiDate (a dep), which would re-run the effect and cancel the timer early.
  useEffect(() => {
    if (!data?.isComplete)
      return
    const today = getToday()
    if (lastConfettiDate === today || confettiFiredRef.current)
      return
    confettiFiredRef.current = true
    setLastConfettiDate(today)
    confettiRef.current?.classList.add('animate-confetti')
    const timer = setTimeout(() => {
      confettiRef.current?.classList.remove('animate-confetti')
      confettiFiredRef.current = false
    }, 2000)
    return () => clearTimeout(timer)
  }, [data?.isComplete, lastConfettiDate, setLastConfettiDate])

  if (isLoading) {
    return <Skeleton data-testid="daily-goal-skeleton" className="h-24 w-full" />
  }

  if (!data)
    return null

  const pct = Math.min(100, Math.round((data.todayCount / data.goal) * 100))

  return (
    <Card className="p-4 relative overflow-hidden">
      <div
        ref={confettiRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      />

      <CardContent className="p-0 flex flex-col gap-3">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">
          {t('goal.label')}
        </p>

        {/* Progress bar */}
        <div className="h-2 w-full bg-muted rounded-none overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${data.isComplete ? 'bg-green-500' : 'bg-destructive'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Count label */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold font-[var(--br-mono-font)]">
            {data.todayCount}
            /
            {data.goal}
          </span>
          <span className="text-xs font-[var(--br-mono-font)] text-muted-foreground uppercase">{t('goal.unit')}</span>
        </div>

        {/* Completion message */}
        {data.isComplete && (
          <p className="text-xs font-[var(--br-mono-font)] text-green-500 uppercase">
            {t('goal.complete')}
          </p>
        )}

        {/* 7-day history strip — streak7 is number[] (index 0 = oldest) */}
        <div className="flex gap-1 items-end h-6 mt-1">
          {getLastNDates(7).map((date, i) => {
            const count = data.streak7[i] ?? 0
            const isToday = i === data.streak7.length - 1
            const achieved = count >= data.goal
            const barH = count === 0 ? 4 : Math.max(6, Math.min(24, Math.round((count / data.goal) * 24)))
            const color = achieved
              ? 'bg-green-500'
              : isToday && count > 0
                ? 'bg-destructive'
                : count > 0
                  ? 'bg-muted-foreground/40'
                  : 'bg-muted'
            return (
              <div
                key={date}
                data-testid="history-bar"
                className={`flex-1 rounded-sm ${color}`}
                style={{ height: `${barH}px` }}
                aria-label={`Day ${i + 1}: ${count} reviews`}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
