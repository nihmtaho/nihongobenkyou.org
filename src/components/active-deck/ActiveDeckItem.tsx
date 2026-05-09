import type { KanjiItem } from '@/types/kanji'
import type { VocabItem } from '@/types/vocabulary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function isDue(dueDate: string): boolean {
  return dueDate <= new Date().toISOString().slice(0, 10)
}

function daysRemaining(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date(new Date().toISOString().slice(0, 10))
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
}

interface VocabDeckItemProps {
  vocab: VocabItem
  dueDate: string
  onRemove: () => void
}

export function VocabDeckItem({ vocab, dueDate, onRemove }: VocabDeckItemProps) {
  const due = isDue(dueDate)
  const days = due ? 0 : daysRemaining(dueDate)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/10 hover:bg-secondary/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className={cn('font-[var(--br-jp-font)] font-bold leading-tight', vocab.word ? 'text-xl' : 'text-lg')}>
          {vocab.word ?? vocab.reading}
        </p>
        <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground truncate mt-0.5">
          {vocab.reading}
          {' · '}
          {vocab.meaning_vi}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {due
          ? (
              <Badge className="bg-destructive text-destructive-foreground font-[var(--br-mono-font)] text-[9px] px-1.5 py-px">
                DUE
              </Badge>
            )
          : (
              <span className="font-[var(--br-mono-font)] text-[10px] text-muted-foreground tabular-nums">
                {days}
                d
              </span>
            )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Xóa khỏi deck"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          ✕
        </Button>
      </div>
    </div>
  )
}

interface KanjiDeckItemProps {
  kanji: KanjiItem
  dueDate: string
  onRemove: () => void
}

export function KanjiDeckItem({ kanji, dueDate, onRemove }: KanjiDeckItemProps) {
  const due = isDue(dueDate)
  const days = due ? 0 : daysRemaining(dueDate)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/10 hover:bg-secondary/40 transition-colors">
      <span className="font-[var(--br-jp-font)] text-3xl font-bold leading-none w-9 shrink-0 text-center">
        {kanji.char}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-[var(--br-mono-font)] font-bold truncate leading-tight">
          {kanji.meaning_vi[0] ?? kanji.meaning_en[0] ?? '—'}
        </p>
        {kanji.onyomi.length > 0 && (
          <p className="text-[10px] font-[var(--br-jp-font)] text-muted-foreground truncate mt-0.5">
            {kanji.onyomi.join('・')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {due
          ? (
              <Badge className="bg-destructive text-destructive-foreground font-[var(--br-mono-font)] text-[9px] px-1.5 py-px">
                DUE
              </Badge>
            )
          : (
              <span className="font-[var(--br-mono-font)] text-[10px] text-muted-foreground tabular-nums">
                {days}
                d
              </span>
            )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Xóa khỏi deck"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          ✕
        </Button>
      </div>
    </div>
  )
}
