import { Button } from '@/components/ui/button'
import { useHiddenVocabDetails, useUnhideVocab } from '../../hooks/useHiddenVocab'

interface HiddenVocabListProps {
  source: 'lesson' | 'custom'
  userId: string
}

export function HiddenVocabList({ source, userId }: HiddenVocabListProps) {
  const { hiddenIds, items } = useHiddenVocabDetails(userId, source)
  const { mutate: unhide, isPending, variables } = useUnhideVocab()

  if (hiddenIds.size === 0) {
    return (
      <p className="px-4 py-3 text-[11px] font-[var(--br-mono-font)] text-muted-foreground uppercase">
        Không có từ nào đang ẩn
      </p>
    )
  }

  return (
    <div>
      {items.map(item => (
        <div key={item.itemId} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5">
          <div className="flex-1 min-w-0">
            <p className="font-[var(--br-jp-font)] font-bold text-sm leading-tight">{item.word}</p>
            {item.reading !== item.word && (
              <p className="font-[var(--br-jp-font)] text-[10px] text-muted-foreground">{item.reading}</p>
            )}
            <p className="font-[var(--br-jp-font)] text-[10px] text-muted-foreground/60 truncate">{item.meaning}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending && variables?.itemId === item.itemId}
            onClick={() => unhide({ itemId: item.itemId, source, userId })}
            aria-label={`Bỏ ẩn ${item.word}`}
            className="font-[var(--br-mono-font)] text-[10px] uppercase h-6 px-2 shrink-0 text-primary border-primary/50"
          >
            HIỆN
          </Button>
        </div>
      ))}
    </div>
  )
}
