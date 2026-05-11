import { EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HiddenVocabBadgeProps {
  count: number
  onClick: () => void
  className?: string
}

export function HiddenVocabBadge({ count, onClick, className }: HiddenVocabBadgeProps) {
  if (count === 0)
    return null
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-label={`Xem ${count} từ đang ẩn`}
      className={cn(
        'font-[var(--br-mono-font)] text-[10px] uppercase border border-border/20 text-muted-foreground h-7 px-2 gap-1',
        className,
      )}
    >
      <EyeOffIcon className="h-3 w-3" />
      {count}
      {' '}
      ẨN
    </Button>
  )
}
