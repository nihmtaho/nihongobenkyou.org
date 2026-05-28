import type { LeaderboardEntry } from '../../types/user'
import { PODIUM_SIZE } from '../../hooks/useLeaderboard'
import { getInitial } from '../../lib/text-utils'

interface Props {
  entries: LeaderboardEntry[] // top PODIUM_SIZE entries, sorted by rank ascending
}

interface PodiumEntryProps {
  entry: LeaderboardEntry
  heightClass: string
}

function PodiumEntry({ entry, heightClass }: PodiumEntryProps) {
  return (
    <div className="flex flex-col items-center flex-1">
      {entry.rank === 1 && <span className="text-xl mb-1">👑</span>}
      <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm mb-1">
        {getInitial(entry.display_name)}
      </div>
      <p className="text-xs font-semibold text-center truncate max-w-[80px]">{entry.display_name}</p>
      <p className="text-xs text-muted-foreground">{entry.cards_reviewed}</p>
      <div className={`w-full rounded-t-sm bg-foreground flex items-center justify-center mt-1 ${heightClass}`}>
        <span className="text-background font-black text-sm">{entry.rank}</span>
      </div>
    </div>
  )
}

export function LeaderboardPodium({ entries }: Props) {
  if (entries.length === 0)
    return null

  // Use positional indexing on sorted entries to handle rank ties gracefully.
  // Podium layout order: 2nd (left), 1st (center, tallest), 3rd (right).
  const sorted = entries.slice(0, PODIUM_SIZE)
  const [first, second, third] = sorted.sort((a, b) => a.rank - b.rank)

  return (
    <div className="flex items-end gap-2 px-4 pb-0 pt-4 bg-muted/30 rounded-t border border-b-0">
      {second && <PodiumEntry entry={second} heightClass="h-10" />}
      {first && <PodiumEntry entry={first} heightClass="h-16" />}
      {third && <PodiumEntry entry={third} heightClass="h-7" />}
    </div>
  )
}
