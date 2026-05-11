import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { db } from '../../db/schema'
import { useHiddenVocab, useUnhideVocab } from '../../hooks/useHiddenVocab'

interface DisplayItem {
  itemId: string
  word: string
  reading: string
  meaning: string
}

interface HiddenVocabListProps {
  source: 'lesson' | 'custom'
  userId: string
}

export function HiddenVocabList({ source, userId }: HiddenVocabListProps) {
  const hiddenIds = useHiddenVocab(userId, source)
  const { mutate: unhide, isPending } = useUnhideVocab()
  const idArray = useMemo(() => Array.from(hiddenIds), [hiddenIds])

  const { data: items = [] } = useQuery<DisplayItem[]>({
    queryKey: ['hidden-vocab-details', source, idArray.slice().sort().join(',')],
    queryFn: async () => {
      if (source === 'lesson') {
        const vocabs = await db.vocabulary.bulkGet(idArray)
        return vocabs
          .filter((v): v is NonNullable<typeof v> => v != null)
          .map(v => ({
            itemId: v.vocab_id,
            word: v.word ?? v.reading,
            reading: v.reading,
            meaning: v.meaning_vi,
          }))
      }
      const customs = await db.custom_vocabulary.bulkGet(idArray)
      return customs
        .filter((v): v is NonNullable<typeof v> => v != null)
        .map(v => ({
          itemId: v.id,
          word: v.kanji ?? v.kana,
          reading: v.kana,
          meaning: v.meaning_vi,
        }))
    },
    enabled: idArray.length > 0,
    staleTime: Infinity,
  })

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
            disabled={isPending}
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
