import type { CardState } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { EyeOffIcon, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useHideVocab } from '../../hooks/useHiddenVocab'
import { AddToDeckDialog } from '../common/AddToDeckDialog'

interface VocabIndexRowProps {
  item: VocabItem
  card: CardState | null
  index: number
  isSelected: boolean
  today: string
  onSelect: () => void
  userId: string
}

export function VocabIndexRow({ item, card, index, isSelected, today, onSelect, userId }: VocabIndexRowProps) {
  const isKnown = card?.is_known === true
  const isDue = card != null && !isKnown && card.due_date <= today
  const isNew = card == null
  const [dialogOpen, setDialogOpen] = useState(false)
  const { mutate: hide, isPending: isHiding } = useHideVocab()

  return (
    <div className="group relative">
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
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {isDue && (
                  <span className="font-[var(--br-mono-font)] text-[9px] text-destructive uppercase tracking-wider">DUE</span>
                )}
                {isKnown && (
                  <span className="font-[var(--br-mono-font)] text-[9px] text-success uppercase">✓</span>
                )}
                {isNew && !isDue && (
                  <span className="font-[var(--br-mono-font)] text-[9px] text-foreground/25 uppercase">NEW</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Thêm ${item.word ?? item.reading} vào deck`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
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
        }}
        disabled={isHiding}
        aria-label={`Ẩn ${item.word ?? item.reading}`}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] flex items-center gap-0.5 text-[9px] font-[var(--br-mono-font)] uppercase text-destructive border border-destructive/40 px-1.5 py-0.5 bg-background hover:bg-destructive hover:text-destructive-foreground"
      >
        <EyeOffIcon className="h-2.5 w-2.5" />
        ẨN
      </button>

      <AddToDeckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vocabItem={item}
        userId={userId}
      />
    </div>
  )
}
