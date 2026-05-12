import type { VocabItem } from '../../types/vocabulary'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { useAddVocabToDecks } from '../../hooks/useAddVocabToDecks'
import { useCustomDeckMutations } from '../../hooks/useCustomDeckMutations'
import { useCustomDecks } from '../../hooks/useCustomDecks'

interface AddToDeckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vocabItem: Pick<VocabItem, 'vocab_id' | 'word' | 'reading' | 'meaning_vi' | 'han_viet'>
  userId: string
}

export function AddToDeckDialog({ open, onOpenChange, vocabItem, userId }: AddToDeckDialogProps) {
  const { data: decks = [] } = useCustomDecks(userId)
  const addToDecks = useAddVocabToDecks(userId)
  const deckMutations = useCustomDeckMutations(userId)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const isEmpty = decks.length === 0

  function handleToggle(deckId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(deckId))
        next.delete(deckId)
      else
        next.add(deckId)
      return next
    })
  }

  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim())
      return
    try {
      const created = await deckMutations.createDeck.mutateAsync({ title: newTitle.trim() })
      setSelectedIds(prev => new Set([...prev, created.id]))
      setNewTitle('')
      setShowCreateForm(false)
    }
    catch {
      // toast already fired by mutation's onError if configured; form stays visible for retry
    }
  }

  async function handleConfirm() {
    const parsedItem = {
      word: vocabItem.word ?? null,
      kana: vocabItem.reading,
      han_viet: vocabItem.han_viet ?? null,
      meaning_vi: vocabItem.meaning_vi,
    }
    try {
      await addToDecks.mutateAsync({ deckIds: [...selectedIds], parsedItem })
      setSelectedIds(new Set())
      onOpenChange(false)
    }
    catch {
      // onError toast already fired; dialog stays open for retry
    }
  }

  const displayWord = vocabItem.word ?? vocabItem.reading

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelectedIds(new Set())
          setShowCreateForm(false)
          setNewTitle('')
        }
        onOpenChange(o)
      }}
    >
      <ResponsiveDialogContent className="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-[var(--br-heading-font)] uppercase text-base tracking-tight">
            THÊM VÀO DECK
          </ResponsiveDialogTitle>
          <p className="text-[11px] font-[var(--br-jp-font)] text-muted-foreground">
            {displayWord}
            {' '}
            ·
            {' '}
            {vocabItem.meaning_vi}
          </p>
        </ResponsiveDialogHeader>

        <div className="flex flex-col gap-1 mt-2 max-h-60 overflow-y-auto">
          {isEmpty && !showCreateForm && (
            <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground py-2">
              Chưa có deck nào.
            </p>
          )}

          {decks.map(deck => (
            <label
              key={deck.id}
              className="flex items-center justify-between px-3 py-2 border border-border/20 cursor-pointer hover:bg-card/50"
            >
              <div>
                <p className="text-sm font-bold font-[var(--br-mono-font)] uppercase">{deck.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {deck.word_count}
                  {' '}
                  từ
                </p>
              </div>
              <input
                type="checkbox"
                aria-label={deck.title}
                checked={selectedIds.has(deck.id)}
                onChange={() => handleToggle(deck.id)}
                className="w-4 h-4"
              />
            </label>
          ))}

          {/* Inline create form */}
          {(showCreateForm || isEmpty) && (
            <form onSubmit={handleCreateDeck} className="flex flex-col gap-2 pt-2">
              <Input
                placeholder={isEmpty ? 'Tên deck *' : 'Tên deck mới *'}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                maxLength={100}
                autoFocus={isEmpty}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newTitle.trim() || deckMutations.createDeck.isPending}
                >
                  {deckMutations.createDeck.isPending ? 'Đang tạo…' : 'Tạo'}
                </Button>
                {!isEmpty && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewTitle('')
                    }}
                  >
                    Hủy
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 mt-3 border-t border-border/10 pt-3">
          {!showCreateForm && !isEmpty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full font-[var(--br-mono-font)] text-[11px] justify-start gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              ＋ TẠO DECK MỚI
            </Button>
          )}
          <Button
            type="button"
            className="w-full font-[var(--br-mono-font)] uppercase text-[11px]"
            disabled={selectedIds.size === 0 || addToDecks.isPending}
            onClick={handleConfirm}
          >
            {addToDecks.isPending ? 'Đang thêm…' : 'XÁC NHẬN'}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
