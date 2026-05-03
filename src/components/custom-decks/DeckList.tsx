import type { CustomDeck } from '../../types/custom-deck'
import { Button } from '@/components/ui/button'

interface Props {
  decks: CustomDeck[]
  onNewDeck: () => void
  onSelectDeck: (deckId: string) => void
}

export function DeckList({ decks, onNewDeck, onSelectDeck }: Props) {
  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-foreground/60">Chưa có bộ từ vựng nào</p>
        <Button onClick={onNewDeck}>
          Tạo bộ từ vựng đầu tiên
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Bộ từ vựng của tôi</h2>
        <Button size="sm" onClick={onNewDeck}>
          + Tạo mới
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map(deck => (
          <button
            key={deck.id}
            className="bg-card border border-secondary hover:border-primary transition-colors text-left"
            onClick={() => onSelectDeck(deck.id)}
          >
            <div className="card-body p-4 gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="card-title text-base">{deck.title}</h3>
                {deck.is_public && (
                  <span className="text-[10px] font-[var(--br-mono-font)] border border-border px-1.5 py-0.5 shrink-0">Công khai</span>
                )}
              </div>
              {deck.description && (
                <p className="text-sm text-foreground/60 line-clamp-2">{deck.description}</p>
              )}
              <div className="text-sm text-foreground/60">
                {deck.word_count}
                {' '}
                từ
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
