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

interface Props {
  deck: CustomDeck
  isSelected: boolean
  onClick: () => void
  onStudy: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export function DeckCard({ deck, isSelected, onClick, onStudy, onToggleActive, onDelete }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          className={[
            'relative w-full text-left border-2 p-3 bg-card transition-colors',
            isSelected ? 'border-primary' : 'border-border hover:border-primary/50',
          ].join(' ')}
        >
          <div className="pr-6">
            <p className="font-[var(--br-heading-font)] text-sm font-bold uppercase tracking-tight truncate">
              {deck.title}
            </p>
            <p className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground mt-1">
              {deck.word_count}
              {' '}
              TỪ
            </p>
            {deck.is_active && (
              <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-primary tracking-widest">
                ● ĐANG HỌC
              </span>
            )}
          </div>

          {/* ⋮ button for mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-60 hover:opacity-100"
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
