import type { CustomDeck } from '../../types/custom-deck'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeckCard } from './DeckCard'

interface Props {
  startedDecks: CustomDeck[]
  unstartedDecks: CustomDeck[]
  userId: string
  selectedDeckId: string | null
  onSelectDeck: (deckId: string) => void
  onNewDeck: () => void
  onStudy: (deck: CustomDeck) => void
  onToggleActive: (deckId: string) => void
  onDeleteDeck: (deckId: string) => void
}

export function DeckGrid({
  startedDecks,
  unstartedDecks,
  userId,
  selectedDeckId,
  onSelectDeck,
  onNewDeck,
  onStudy,
  onToggleActive,
  onDeleteDeck,
}: Props) {
  const hasDecks = startedDecks.length > 0 || unstartedDecks.length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-[var(--br-heading-font)] text-xl font-bold uppercase tracking-tight">
          MY DECKS
        </h2>
        <Button size="sm" onClick={onNewDeck} className="gap-1">
          <Plus className="h-3 w-3" />
          DECK
        </Button>
      </div>

      {!hasDecks
        ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Chưa có bộ từ nào</p>
              <Button size="sm" onClick={onNewDeck}>Tạo deck đầu tiên</Button>
            </div>
          )
        : (
            <div className="flex flex-col gap-6">
              {/* Started Decks Section */}
              {startedDecks.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                    ĐANG HỌC
                    {' '}
                    (
                    {startedDecks.length}
                    )
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {startedDecks.map(deck => (
                      <DeckCard
                        key={deck.id}
                        deck={deck}
                        userId={userId}
                        isSelected={deck.id === selectedDeckId}
                        isUnstarted={false}
                        onClick={() => onSelectDeck(deck.id)}
                        onStudy={() => onStudy(deck)}
                        onToggleActive={() => onToggleActive(deck.id)}
                        onDelete={() => onDeleteDeck(deck.id)}
                      />
                    ))}
                  </div>
                  {unstartedDecks.length > 0 && <hr className="border-border/10" />}
                </div>
              )}

              {/* Unstarted Decks Section */}
              {unstartedDecks.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
                    CHƯA HỌC
                    {' '}
                    (
                    {unstartedDecks.length}
                    )
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {unstartedDecks.map(deck => (
                      <DeckCard
                        key={deck.id}
                        deck={deck}
                        userId={userId}
                        isSelected={deck.id === selectedDeckId}
                        isUnstarted={true}
                        onClick={() => onSelectDeck(deck.id)}
                        onStudy={() => onStudy(deck)}
                        onToggleActive={() => onToggleActive(deck.id)}
                        onDelete={() => onDeleteDeck(deck.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
    </div>
  )
}
