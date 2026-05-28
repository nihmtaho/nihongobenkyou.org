import type { LeaderboardEntry } from '../../types/user'

interface Props {
  entries: LeaderboardEntry[] // entries with rank > 3
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

export function LeaderboardList({ entries }: Props) {
  if (entries.length === 0)
    return null

  return (
    <div className="border border-t-0 rounded-b divide-y">
      {entries.map(entry => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 px-4 py-2 ${entry.is_current_user ? 'bg-primary/10' : ''}`}
        >
          <span className="w-8 text-sm font-bold text-muted-foreground">
            #
            {entry.rank}
          </span>
          <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
            {getInitial(entry.display_name)}
          </div>
          <span className="flex-1 text-sm truncate">{entry.display_name}</span>
          <span className="text-sm font-semibold">{entry.cards_reviewed}</span>
          <span className="text-xs text-muted-foreground">thẻ</span>
        </div>
      ))}
    </div>
  )
}
