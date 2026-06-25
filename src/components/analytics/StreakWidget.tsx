import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStreak } from '../../hooks/useStreak'
import { useTranslation } from '../../hooks/useTranslation'

interface StreakWidgetProps {
  userId: string
}

export function StreakWidget({ userId }: StreakWidgetProps) {
  const { t } = useTranslation()
  const streak = useStreak(userId)

  if (streak === undefined) {
    return <Skeleton className="h-16 w-full" />
  }

  const currentStreak = streak?.current_streak ?? 0

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-2">
          {t('streak.label')}
        </p>
        <div className="flex items-baseline gap-2">
          {currentStreak > 0 && (
            <span className="text-destructive text-xl" aria-hidden="true">🔥</span>
          )}
          <span className="text-4xl font-bold font-[var(--br-mono-font)]">{currentStreak}</span>
          <span className="text-sm font-[var(--br-mono-font)] text-muted-foreground uppercase">{t('streak.unit')}</span>
        </div>
      </CardContent>
    </Card>
  )
}
