import type { CustomDeck, ParsedVocabItem } from '../../types/custom-deck'
import { useCallback, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCustomDeckWords } from '../../hooks/useCustomDeckWords'
import { useCustomVocabMutations } from '../../hooks/useCustomVocabMutations'
import { useHiddenVocab, useHideVocab } from '../../hooks/useHiddenVocab'
import { HiddenVocabBadge } from '../vocabulary/HiddenVocabBadge'
import { HiddenVocabList } from '../vocabulary/HiddenVocabList'
import { EditableVocabTable } from './EditableVocabTable'
import { VocabInputArea } from './VocabInputArea'

const DEFAULT_WIDTH = 560
const MIN_WIDTH = 380
const MAX_WIDTH_RATIO = 0.92

interface Props {
  deck: CustomDeck | null
  userId: string
  onClose: () => void
}

export function DeckSheet({ deck, userId, onClose }: Props) {
  const { data: words = [] } = useCustomDeckWords(deck?.id ?? null, userId)
  const mutations = useCustomVocabMutations(deck?.id ?? '', userId)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [showHiddenPanel, setShowHiddenPanel] = useState(false)
  const { mutate: hide } = useHideVocab()
  const hiddenIds = useHiddenVocab(userId, 'custom')
  const hiddenCount = hiddenIds.size
  const dragStartXRef = useRef<number | null>(null)
  const dragStartWidthRef = useRef(DEFAULT_WIDTH)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    dragStartXRef.current = e.clientX
    dragStartWidthRef.current = width

    function onMove(ev: MouseEvent) {
      if (dragStartXRef.current === null)
        return
      const delta = dragStartXRef.current - ev.clientX
      const maxW = window.innerWidth * MAX_WIDTH_RATIO
      setWidth(Math.min(maxW, Math.max(MIN_WIDTH, dragStartWidthRef.current + delta)))
    }

    function onUp() {
      dragStartXRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width])

  async function handleSave(items: ParsedVocabItem[], source: 'json' | 'csv') {
    await mutations.addWords.mutateAsync({ items, source })
  }

  return (
    <Sheet open={!!deck} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        style={{ width, maxWidth: `${MAX_WIDTH_RATIO * 100}vw` }}
        className="flex flex-col gap-0 p-0 overflow-hidden transition-none"
      >
        {/* Left-edge drag handle (desktop only) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hidden sm:flex items-center justify-center group z-10 hover:bg-primary/20 active:bg-primary/30"
          onMouseDown={handleDragStart}
        >
          <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </div>
        <SheetHeader className="pl-3 pr-5 py-4 border-b border-border/30">
          <SheetTitle className="font-[var(--br-heading-font)] uppercase tracking-tight text-base">
            {deck?.title ?? ''}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
              {deck?.word_count ?? 0}
              {' '}
              TỪ
              {deck?.is_active && <span className="ml-2 text-primary">● ĐANG HỌC</span>}
            </p>
            <HiddenVocabBadge count={hiddenCount} onClick={() => setShowHiddenPanel(v => !v)} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-0">
          {/* Vocab input */}
          <div className="px-5 py-4 border-b border-border/20">
            {deck && (
              <VocabInputArea
                deckId={deck.id}
                userId={userId}
                onSave={handleSave}
                isPending={mutations.addWords.isPending}
              />
            )}
          </div>

          {/* Word list */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-3">
              DANH SÁCH (
              {words.length}
              {' '}
              TỪ)
            </p>
            <EditableVocabTable
              words={words}
              onUpdate={(wordId, updates) => mutations.updateWord.mutate({ wordId, updates })}
              onDelete={wordId => mutations.deleteWord.mutate(wordId)}
              onHide={wordId => hide({ itemId: wordId, source: 'custom', userId })}
              isPending={mutations.updateWord.isPending || mutations.deleteWord.isPending}
            />
          </div>

          {showHiddenPanel && (
            <div className="px-5 py-4 border-t border-border/20">
              <p className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-3">
                TỪ ĐANG ẨN (
                {hiddenCount}
                )
              </p>
              <HiddenVocabList source="custom" userId={userId} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
