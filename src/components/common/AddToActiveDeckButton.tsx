import { Bookmark, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AddToActiveDeckButtonProps {
  inDeck: boolean
  onToggle: () => void
  isPending?: boolean
  className?: string
}

export function AddToActiveDeckButton({
  inDeck,
  onToggle,
  isPending = false,
  className,
}: AddToActiveDeckButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      disabled={isPending}
      aria-label={inDeck ? 'Xóa khỏi HỌC NGẮT QUÃNG' : 'Thêm vào HỌC NGẮT QUÃNG'}
      className={cn(
        'flex-shrink-0 transition-colors duration-100',
        inDeck
          ? 'text-primary hover:text-primary/70'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {inDeck
        ? <Bookmark className="h-4 w-4 fill-current" />
        : <Plus className="h-4 w-4" />}
    </Button>
  )
}
