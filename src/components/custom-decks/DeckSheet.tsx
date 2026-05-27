import type { CustomDeck, ParsedVocabItem } from '../../types/custom-deck'
import { Check, Pencil, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCustomDeckMutations } from '../../hooks/useCustomDeckMutations'
import { useCustomDeckWords } from '../../hooks/useCustomDeckWords'
import { useCustomVocabMutations } from '../../hooks/useCustomVocabMutations'
import { useHiddenVocab, useHideVocab } from '../../hooks/useHiddenVocab'
import { HiddenVocabBadge } from '../vocabulary/HiddenVocabBadge'
import { HiddenVocabList } from '../vocabulary/HiddenVocabList'
import { EditableVocabTable } from './EditableVocabTable'
import { VocabInputArea } from './VocabInputArea'

interface EditState { deckId: string | null, title: string, description: string }

const DEFAULT_WIDTH = 560
const MIN_WIDTH = 380
const MAX_WIDTH_RATIO = 0.92

interface Props {
  deck: CustomDeck | null
  userId: string
  onClose: () => void
  onUpdate?: (deckId: string, updates: Partial<CustomDeck>) => void
}

export function DeckSheet({ deck, userId, onClose }: Props) {
  const { data: words = [] } = useCustomDeckWords(deck?.id ?? null, userId)
  const mutations = useCustomVocabMutations(deck?.id ?? '', userId)
  const deckMutations = useCustomDeckMutations(userId)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [showHiddenPanel, setShowHiddenPanel] = useState(false)
  const { mutate: hide } = useHideVocab()
  const hiddenIds = useHiddenVocab(userId, 'custom')
  const hiddenCount = hiddenIds.size
  const dragStartXRef = useRef<number | null>(null)
  const dragStartWidthRef = useRef(DEFAULT_WIDTH)

  // editingDeckId being set to deck.id means we're in edit mode for that deck.
  // If deck changes (different id), isEditing becomes false automatically — no useEffect needed.
  const [editState, setEditState] = useState<EditState>({
    deckId: null,
    title: '',
    description: '',
  })
  const isEditing = editState.deckId === deck?.id

  function startEdit() {
    setEditState({ deckId: deck?.id ?? null, title: deck?.title ?? '', description: deck?.description ?? '' })
  }

  function cancelEdit() {
    setEditState(s => ({ ...s, deckId: null }))
  }

  function saveEdit() {
    if (!deck || !editState.title.trim())
      return
    deckMutations.updateDeck.mutate(
      {
        deckId: deck.id,
        updates: {
          title: editState.title.trim(),
          description: editState.description.trim() || undefined,
        },
      },
      {
        onSuccess: () => setEditState(s => ({ ...s, deckId: null })),
        onError: () => toast.error('Không cập nhật được deck. Vui lòng thử lại.'),
      },
    )
  }

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
          {isEditing
            ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editState.title}
                    onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                    placeholder="Tên deck *"
                    maxLength={100}
                    autoFocus
                    className="font-[var(--br-heading-font)] uppercase text-base font-bold"
                  />
                  <Input
                    value={editState.description}
                    onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                    placeholder="Mô tả (tùy chọn)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={!editState.title.trim() || deckMutations.updateDeck.isPending}
                      className="flex items-center gap-1 text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={deckMutations.updateDeck.isPending}
                      className="flex items-center gap-1 text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Hủy
                    </button>
                  </div>
                </div>
              )
            : (
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="font-[var(--br-heading-font)] uppercase tracking-tight text-base">
                    {deck?.title ?? ''}
                  </SheetTitle>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    aria-label="Chỉnh sửa tên deck"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
                {deck?.word_count ?? 0}
                {' '}
                TỪ
                {deck?.is_active && <span className="ml-2 text-primary">● ĐANG HỌC</span>}
              </p>
              <HiddenVocabBadge count={hiddenCount} onClick={() => setShowHiddenPanel(v => !v)} />
            </div>
          )}
          {!isEditing && deck?.description && (
            <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground/70 mt-0.5">
              {deck.description}
            </p>
          )}
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
