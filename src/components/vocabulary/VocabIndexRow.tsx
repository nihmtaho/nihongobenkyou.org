import type { SRSCard } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { EyeOffIcon } from 'lucide-react'
import { useRef, useState } from 'react'

import { useHideVocab } from '../../hooks/useHiddenVocab'

interface VocabIndexRowProps {
  item: VocabItem
  card: SRSCard | null
  index: number
  isSelected: boolean
  today: string
  onSelect: () => void
  userId: string
}

export function VocabIndexRow({ item, card, index, isSelected, today, onSelect, userId }: VocabIndexRowProps) {
  const isKnown = card?.is_known === true
  const isDue = card != null && !isKnown && card.due <= today
  const isNew = card == null
  const [hideRevealed, setHideRevealed] = useState(false)
  const touchStartXRef = useRef(0)
  const { mutate: hide, isPending: isHiding } = useHideVocab()

  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = touchStartXRef.current - e.changedTouches[0].clientX
    if (dx > 50)
      setHideRevealed(true)
    else if (dx < -30)
      setHideRevealed(false)
  }

  return (
    <div
      className="group relative flex items-stretch"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 text-left px-4 py-3 border-b border-border/5 transition-colors duration-[80ms] ${
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
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {isDue && (
                  <span className="font-[var(--br-mono-font)] text-[9px] text-destructive uppercase tracking-wider">DUE</span>
                )}
                {isKnown && (
                  <span className="font-[var(--br-mono-font)] text-[9px] text-success uppercase">✓</span>
                )}
                {isNew && (
                  <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/25 uppercase">NEW</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          hide({ itemId: item.vocab_id, source: 'lesson', userId })
          setHideRevealed(false)
        }}
        disabled={isHiding}
        aria-label={`Ẩn ${item.word ?? item.reading}`}
        className={`absolute right-0 top-1/2 -translate-y-1/2 transition-opacity duration-[120ms] flex items-center gap-0.5 text-[9px] font-[var(--br-mono-font)] uppercase text-destructive border border-destructive/40 px-1.5 py-0.5 bg-background hover:bg-destructive hover:text-destructive-foreground ${hideRevealed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'}`}
      >
        <EyeOffIcon className="h-2.5 w-2.5" />
        ẨN
      </button>

    </div>
  )
}
