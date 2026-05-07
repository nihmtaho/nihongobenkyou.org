import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingBackButtonProps {
  visible: boolean
  onBack: () => void
  label?: string
}

export function FloatingBackButton({ visible, onBack, label }: FloatingBackButtonProps) {
  return (
    <button
      onClick={onBack}
      aria-label={label ? `Back to ${label}` : 'Go back'}
      className={cn(
        'fixed top-3 left-3 z-50 lg:hidden',
        'size-9 bg-foreground text-background',
        'flex items-center justify-center',
        'transition-opacity duration-200',
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
    >
      <ChevronLeft size={18} aria-hidden />
    </button>
  )
}
