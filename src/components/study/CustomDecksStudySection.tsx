import type { CustomDeck } from '../../types/custom-deck'
import type { StudyMode, TypeInputSubMode } from '../../types/study'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCustomDeckProgress } from '../../hooks/useCustomDeckProgress'
import { useCustomDecks } from '../../hooks/useCustomDecks'
import { useLaunchCustomDeckSession } from '../../hooks/useLaunchCustomDeckSession'
import { VocabStudyModal } from './VocabStudyModal'

// Per-deck row — calls useCustomDeckProgress inside its own component scope
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

  return (
    <div className="flex items-center gap-3 border border-border/10 px-3 py-2.5 hover:border-border/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
          {deck.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
            {deck.word_count}
            {' '}
            TỪ
          </span>
          {progress && progress.dueToday > 0 && (
            <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-destructive tracking-widest">
              •
              {' '}
              {progress.dueToday}
              {' '}
              đến hạn
            </span>
          )}
        </div>
        {progress && progress.total > 0 && (
          <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={progress && progress.dueToday > 0 ? 'default' : 'outline'}
        className="shrink-0 h-7 text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest"
        onClick={() => onStudy(deck)}
        disabled={deck.word_count === 0}
      >
        {progress && progress.dueToday > 0 ? `▶ ${progress.dueToday}` : '▶'}
      </Button>
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

  if (isLoading)
    return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
          CUSTOM DECKS
        </p>
        <Link
          to="/custom"
          className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground/60 hover:text-muted-foreground tracking-widest transition-colors"
        >
          Quản lý →
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
        : (
            <div className="flex flex-col gap-1">
              {decks.map(deck => (
                <DeckRow
                  key={deck.id}
                  deck={deck}
                  userId={userId}
                  onStudy={setStudyDeck}
                />
              ))}
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
