import { useStreak } from '../../hooks/useStreak'

interface StreakWidgetProps {
  userId: string
}

export function StreakWidget({ userId }: StreakWidgetProps) {
  const { data: streak, isLoading } = useStreak(userId)

  if (isLoading) {
    return <div className="skeleton h-16 w-full" />
  }

  const currentStreak = streak?.current_streak ?? 0

  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-2">
        STREAK
      </p>
      <div className="flex items-baseline gap-2">
        {currentStreak > 0 && (
          <span className="text-error text-xl" aria-hidden="true">🔥</span>
        )}
        <span className="text-4xl font-bold font-[var(--br-mono-font)]">{currentStreak}</span>
        <span className="text-sm font-[var(--br-mono-font)] text-neutral uppercase">DAYS</span>
      </div>
    </div>
  )
}
