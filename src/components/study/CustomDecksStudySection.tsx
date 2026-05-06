import type { DeckProgress } from '../../hooks/useCustomDeckProgress'
import type { CustomDeck } from '../../types/custom-deck'
import type { StudyMode, TypeInputSubMode } from '../../types/study'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { db } from '../../db/schema'
import { useCustomDeckProgress } from '../../hooks/useCustomDeckProgress'
import { useCustomDecks } from '../../hooks/useCustomDecks'
import { useLaunchCustomDeckSession } from '../../hooks/useLaunchCustomDeckSession'
import { VocabStudyModal } from './VocabStudyModal'

const DASHED_LINK_CLASS
  = 'flex items-center justify-between px-3 py-2.5 border border-dashed border-border/20 hover:border-border/40 text-muted-foreground/60 hover:text-muted-foreground transition-colors text-[11px] font-[var(--br-mono-font)]'

function NextDueBadge({ nextDueDateStr }: { nextDueDateStr: string }) {
  const label = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    if (nextDueDateStr === today)
      return 'Đến hạn hôm nay'
    if (nextDueDateStr === tomorrow)
      return 'Sắp đến hạn: ngày mai'
    const days = Math.round((new Date(nextDueDateStr).getTime() - Date.now()) / 86400000)
    return `Sắp đến hạn: ${days} ngày`
  }, [nextDueDateStr])
  return (
    <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground/60 mt-1">
      {label}
    </p>
  )
}

const STAT_COLS: Array<{ key: keyof DeckProgress, label: string, color: string }> = [
  { key: 'dueToday', label: 'ĐẾN HẠN', color: 'text-destructive' },
  { key: 'learning', label: 'ĐANG HỌC', color: 'text-warning' },
  { key: 'learned', label: 'ÔN TẬP', color: 'text-info' },
  { key: 'mature', label: 'ĐÃ THUỘC', color: 'text-success' },
]

// Per-deck card — calls useCustomDeckProgress inside its own component scope.
// Returns null if this deck has never been studied (started === 0).
function DeckRow({
  deck,
  userId,
  onStudy,
}: {
  deck: CustomDeck
  userId: string
  onStudy: (deck: CustomDeck) => void
}) {
  const { data: progress } = useCustomDeckProgress(userId, deck.id)

  if (!progress || progress.started === 0)
    return null

  return (
    <div className="border border-border/10 hover:border-border/30 transition-colors">
      {/* Title + summary */}
      <div className="px-3 pt-2.5 pb-2">
        <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
          {deck.title}
        </p>
        <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground mt-0.5">
          {deck.word_count}
          {' '}
          TỪ
          {progress.dueToday > 0 && (
            <span className="text-destructive">
              {' '}
              •
              {' '}
              {progress.dueToday}
              {' '}
              đến hạn
            </span>
          )}
        </p>
      </div>

      {/* 4-stat mini-grid */}
      <div className="grid grid-cols-4 gap-[1px] bg-border/10">
        {STAT_COLS.map(({ key, label, color }) => (
          <div key={label} className="bg-card p-2 text-center">
            <p className={`text-sm font-black ${color}`}>{progress[key] as number}</p>
            <p className="text-[7px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar + countdown + button */}
      <div className="px-3 pb-2.5 pt-2 flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
              {progress.percentComplete}
              %
              {' '}
              ·
              {' '}
              {progress.started}
              /
              {progress.total}
              {' '}
              đã học
            </span>
          </div>
          <div className="h-1 w-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          {progress.dueToday === 0 && progress.nextDueDateStr && (
            <NextDueBadge nextDueDateStr={progress.nextDueDateStr} />
          )}
        </div>

        <Button
          size="sm"
          variant={progress.dueToday > 0 ? 'default' : 'outline'}
          className="w-full h-7 text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest"
          onClick={() => onStudy(deck)}
          disabled={deck.word_count === 0}
        >
          {progress.dueToday > 0 ? `▶ ÔN TẬP (${progress.dueToday})` : '▶ HỌC TIẾP'}
        </Button>
      </div>
    </div>
  )
}

interface Props {
  userId: string
}

export function CustomDecksStudySection({ userId }: Props) {
  const { data: decks = [], isLoading } = useCustomDecks(userId)
  const { launch } = useLaunchCustomDeckSession(userId)
  const [studyDeck, setStudyDeck] = useState<CustomDeck | null>(null)

  // Fetch the set of deckIds that have at least one started card,
  // so we can compute unstarted count without waiting for each DeckRow hook.
  const { data: startedDeckIds = new Set<string>() } = useQuery({
    queryKey: ['all-custom-deck-srs-summary', userId],
    queryFn: () =>
      db.custom_deck_srs
        .filter(r => r.userId === userId && r.review_count >= 1)
        .toArray()
        .then(rows => new Set(rows.map(r => r.deckId))),
    staleTime: 0,
    enabled: !!userId,
  })

  if (isLoading)
    return null

  const unstartedDecks = decks.filter(d => !startedDeckIds.has(d.id))
  const hasAnyStarted = decks.length > unstartedDecks.length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          ĐANG HỌC
        </p>
        <Link
          to="/custom"
          className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground/60 hover:text-muted-foreground tracking-widest transition-colors"
        >
          Tất cả deck →
        </Link>
      </div>

      {decks.length === 0
        ? (
            <Link
              to="/custom"
              className="flex items-center justify-center gap-2 border border-dashed border-border/20 px-4 py-6 text-[11px] font-[var(--br-mono-font)] text-muted-foreground hover:border-border/40 transition-colors"
            >
              + Tạo deck đầu tiên
            </Link>
          )
        : !hasAnyStarted
            ? (
                <Link to="/custom" className={DASHED_LINK_CLASS}>
                  <span>
                    Bắt đầu học
                    {' '}
                    {decks.length}
                    {' '}
                    deck →
                  </span>
                </Link>
              )
            : (
                <div className="flex flex-col gap-2">
                  {decks.map(deck => (
                    <DeckRow
                      key={deck.id}
                      deck={deck}
                      userId={userId}
                      onStudy={setStudyDeck}
                    />
                  ))}

                  {unstartedDecks.length > 0 && (
                    <Link to="/custom" className={DASHED_LINK_CLASS}>
                      <span>
                        ＋
                        {' '}
                        {unstartedDecks.length}
                        {' '}
                        deck chưa học
                      </span>
                      <span>→</span>
                    </Link>
                  )}
                </div>
              )}

      {studyDeck && (
        <VocabStudyModal
          title={studyDeck.title}
          context="all"
          onLaunch={(mode: StudyMode, subMode?: TypeInputSubMode) => {
            launch(studyDeck, mode, subMode)
            setStudyDeck(null)
          }}
          onClose={() => setStudyDeck(null)}
        />
      )}
    </div>
  )
}
