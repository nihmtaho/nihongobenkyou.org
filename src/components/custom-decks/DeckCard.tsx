import type { CustomDeck } from '../../types/custom-deck'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCustomDeckProgress } from '../../hooks/useCustomDeckProgress'

interface Props {
  deck: CustomDeck
  userId: string
  isSelected: boolean
  isUnstarted?: boolean
  onClick: () => void
  onStudy: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export function DeckCard({ deck, userId, isSelected, isUnstarted = false, onClick, onStudy, onToggleActive, onDelete }: Props) {
  const { data: progress } = useCustomDeckProgress(userId, deck.id)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          className={[
            'relative w-full text-left border-2 p-3 bg-card transition-colors flex flex-col',
            isSelected ? 'border-primary' : 'border-border hover:border-primary/50',
            isUnstarted ? 'opacity-70' : '',
          ].join(' ')}
        >
          <div className="pr-6 flex-1">
            <p className={['font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate', isUnstarted ? 'opacity-70' : ''].join(' ')}>
              {deck.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground">
                {deck.word_count}
                {' '}
                TỪ
              </p>
              {isUnstarted && (
                <span className="text-[8px] font-[var(--br-mono-font)] uppercase bg-success text-black px-1 py-0.5 rounded-sm tracking-widest font-bold">
                  MỚI
                </span>
              )}
              {!isUnstarted && progress && progress.dueToday > 0 && (
                <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-destructive tracking-widest">
                  •
                  {' '}
                  {progress.dueToday}
                  {' '}
                  đến hạn
                </span>
              )}
            </div>

            {/* Progress bar (only show for started decks) */}
            {!isUnstarted && progress && progress.total > 0 && (
              <div className="mt-2">
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
                <p className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground/60 mt-0.5">
                  {progress.percentComplete}
                  % hoàn thành
                </p>
              </div>
            )}

            {!isUnstarted && deck.is_active && (
              <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-primary tracking-widest">
                ● ĐANG HỌC
              </span>
            )}
          </div>

          {/* Start button for unstarted decks */}
          {isUnstarted && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest border-primary text-primary"
              onClick={(e) => {
                e.stopPropagation()
                onStudy()
              }}
            >
              ▶ BẮT ĐẦU HỌC NGAY
            </Button>
          )}

          {/* ⋮ button for mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute top-1 right-1 opacity-60 hover:opacity-100"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onStudy} className="text-primary">Học ngay</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {deck.is_active ? 'Tắt SRS' : 'Bật SRS'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">Xóa deck</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onStudy} className="text-primary">Học ngay</ContextMenuItem>
        <ContextMenuItem onClick={onToggleActive}>
          {deck.is_active ? 'Tắt SRS' : 'Bật SRS'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive">Xóa deck</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
