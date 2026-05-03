import type { CardState } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

interface VocabIndexRowProps {
  item: VocabItem
  card: CardState | null
  index: number
  isSelected: boolean
  today: string
  onSelect: () => void
}

export function VocabIndexRow({ item, card, index, isSelected, today, onSelect }: VocabIndexRowProps) {
  const isKnown = card?.is_known === true
  const isDue = card != null && !isKnown && card.due_date <= today
  const isNew = card == null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-border/5 transition-colors duration-[80ms] ${
        isSelected
          ? 'border-l-4 border-l-primary bg-card'
          : 'border-l-4 border-l-transparent hover:bg-card/50 active:bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="font-[var(--br-mono-font)] text-[10px] text-muted-foreground/40 mt-0.5 w-5 shrink-0 tabular-nums text-right leading-tight">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-[var(--br-jp-font)] font-bold text-base text-foreground leading-tight">
                {item.word ?? item.reading}
              </p>
              {item.word && (
                <p className="font-[var(--br-jp-font)] text-xs text-muted-foreground leading-tight">{item.reading}</p>
              )}
              <p className="font-[var(--br-jp-font)] text-xs text-muted-foreground/60 mt-0.5 truncate">{item.meaning_vi}</p>
            </div>
            <div className="shrink-0 mt-0.5">
              {isDue && (
                <span className="font-[var(--br-mono-font)] text-[9px] text-destructive uppercase tracking-wider">DUE</span>
              )}
              {isKnown && (
                <span className="font-[var(--br-mono-font)] text-[9px] text-success uppercase">✓</span>
              )}
              {isNew && !isDue && (
                <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/25 uppercase">NEW</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
