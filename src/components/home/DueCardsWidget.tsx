import { Link } from '@tanstack/react-router'

import { useDueCards } from '../../hooks/useDueCards'

interface DueCardsWidgetProps {
  userId: string
}

export function DueCardsWidget({ userId }: DueCardsWidgetProps) {
  const { data: cards, isLoading } = useDueCards(userId)

  if (isLoading) {
    return <div className="skeleton h-16 w-full" />
  }

  const count = cards?.length ?? 0

  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral mb-2">
        DUE TODAY
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold font-[var(--br-mono-font)]">{count}</span>
        <span className="text-sm font-[var(--br-mono-font)] text-neutral uppercase">CARDS</span>
      </div>
      {count === 0
        ? (
            <p className="text-sm font-[var(--br-jp-font)] text-neutral mt-2">すごい! All caught up.</p>
          )
        : (
            <Link to="/srs" className="btn btn-primary btn-sm mt-3 font-[var(--br-mono-font)] self-start">
              START REVIEW
            </Link>
          )}
    </div>
  )
}
