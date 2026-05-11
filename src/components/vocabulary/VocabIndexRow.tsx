import type { CardState } from '../../types/srs'
import type { VocabItem } from '../../types/vocabulary'

import { EyeOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useToggleVocabInDeck } from '../../hooks/useActiveDeck'
import { useHideVocab } from '../../hooks/useHiddenVocab'
import { AddToActiveDeckButton } from '../common/AddToActiveDeckButton'

interface VocabIndexRowProps {
  item: VocabItem
  card: CardState | null
  index: number
  isSelected: boolean
  today: string
  onSelect: () => void
  vocabIdSet: Set<string>
  userId: string
}

export function VocabIndexRow({ item, card, index, isSelected, today, onSelect, vocabIdSet, userId }: VocabIndexRowProps) {
  const isKnown = card?.is_known === true
  const isDue = card != null && !isKnown && card.due_date <= today
  const isNew = card == null
  const inDeck = vocabIdSet.has(item.vocab_id)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toggleMutation = useToggleVocabInDeck(userId)
  const { mutate: hide, isPending: isHiding } = useHideVocab()

  useEffect(() => {
    if (!toastMsg)
      return
    const id = setTimeout(setToastMsg, 2000, null)
    return () => clearTimeout(id)
  }, [toastMsg])

  return (
    <div className="group relative">
      {toastMsg && (
        <div className="toast toast-top toast-center z-50 pointer-events-none">
          <div className="bg-success/10 border border-success/50 px-4 py-2">
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase">{toastMsg}</span>
          </div>
        </div>
      )}
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
                <AddToActiveDeckButton
                  inDeck={inDeck}
                  isPending={toggleMutation.isPending}
                  onToggle={() => toggleMutation.mutate(
                    { vocabId: item.vocab_id, inDeck },
                    { onSuccess: () => setToastMsg(inDeck ? 'Đã xóa khỏi HỌC NGẮT QUÃNG' : 'Đã thêm vào HỌC NGẮT QUÃNG') },
                  )}
                  className="h-6 w-6"
                />
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
    </div>
  )
}
