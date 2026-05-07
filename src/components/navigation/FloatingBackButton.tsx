// src/components/navigation/FloatingBackButton.tsx
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FloatingBackButtonProps {
  visible: boolean
  onBack: () => void
  label?: string
}

export function FloatingBackButton({ visible, onBack, label }: FloatingBackButtonProps) {
  return (
    <Button
      variant="default"
      size="icon-lg"
      onClick={onBack}
      aria-label={label ? `Back to ${label}` : 'Go back'}
      className={cn(
        'fixed top-3 left-3 z-50 lg:hidden',
        'h-11 w-11',
        'motion-safe:transition-opacity motion-safe:duration-200',
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
    >
      <ChevronLeft size={18} aria-hidden />
    </Button>
  )
}
