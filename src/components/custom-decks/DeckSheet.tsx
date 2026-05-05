import type { CustomDeck, ParsedVocabItem } from '../../types/custom-deck'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCustomDeckWords } from '../../hooks/useCustomDeckWords'
import { useCustomVocabMutations } from '../../hooks/useCustomVocabMutations'
import { EditableVocabTable } from './EditableVocabTable'
import { VocabInputArea } from './VocabInputArea'

interface Props {
  deck: CustomDeck | null
  userId: string
  onClose: () => void
}

export function DeckSheet({ deck, userId, onClose }: Props) {
  const { data: words = [] } = useCustomDeckWords(deck?.id ?? null)
  const mutations = useCustomVocabMutations(deck?.id ?? '', userId)

  async function handleSave(items: ParsedVocabItem[], source: 'json' | 'csv') {
    await mutations.addWords.mutateAsync({ items, source })
  }

  return (
    <Sheet open={!!deck} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden"
      >
        <SheetHeader className="px-5 py-4 border-b border-border/30">
          <SheetTitle className="font-[var(--br-heading-font)] uppercase tracking-tight text-base">
            {deck?.title ?? ''}
          </SheetTitle>
          <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
            {deck?.word_count ?? 0}
            {' '}
            TỪ
            {deck?.is_active && <span className="ml-2 text-primary">● ĐANG HỌC</span>}
          </p>
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
              isPending={mutations.updateWord.isPending || mutations.deleteWord.isPending}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
