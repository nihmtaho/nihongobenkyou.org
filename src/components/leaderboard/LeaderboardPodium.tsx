import type { LeaderboardEntry } from '../../types/user'

interface Props {
  entries: LeaderboardEntry[] // top 3 entries, sorted by rank ascending
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
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

  const first = entries.find(e => e.rank === 1)
  const second = entries.find(e => e.rank === 2)
  const third = entries.find(e => e.rank === 3)

  return (
    <div className="flex items-end gap-2 px-4 pb-0 pt-4 bg-muted/30 rounded-t border border-b-0">
      {second && <PodiumEntry entry={second} heightClass="h-10" />}
      {first && <PodiumEntry entry={first} heightClass="h-16" />}
      {third && <PodiumEntry entry={third} heightClass="h-7" />}
    </div>
  )
}
