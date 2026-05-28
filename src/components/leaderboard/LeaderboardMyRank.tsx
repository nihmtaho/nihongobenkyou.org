import type { LeaderboardEntry } from '../../types/user'
import { getInitial } from '../../lib/text-utils'

interface Props {
  entry: LeaderboardEntry
}

export function LeaderboardMyRank({ entry }: Props) {
  return (
    <div className="sticky bottom-0 flex items-center gap-3 px-4 py-3 bg-background border-t-2 border-primary shadow-md">
      <span className="w-8 text-sm font-bold text-primary">
        #
        {entry.rank}
      </span>
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
        {getInitial(entry.display_name)}
      </div>
      <span className="flex-1 text-sm font-semibold truncate">{entry.display_name}</span>
      <span className="text-sm font-bold">{entry.cards_reviewed}</span>
      <span className="text-xs text-muted-foreground">thẻ tuần này</span>
    </div>
  )
}
