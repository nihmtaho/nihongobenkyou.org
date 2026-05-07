// src/components/navigation/MobileTopNav.tsx
import { useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useScrollDirection } from '@/hooks/useScrollDirection'
import { getBackLabel, getNavConfig } from '@/lib/nav-config'
import { cn } from '@/lib/utils'
import { BookInfoSheet } from './BookInfoSheet'
import { FloatingBackButton } from './FloatingBackButton'

export function MobileTopNav() {
  const { location } = useRouterState()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const scrollDir = useScrollDirection()

  const pathname = location.pathname
  const config = getNavConfig(pathname)

  if (!config || config.hideNav)
    return null

  const isHidden = scrollDir === 'down'
  const backLabel = getBackLabel(pathname)
  const backTo = config.backTo

  function handleBack() {
    if (backTo) {
      void router.navigate({ to: backTo })
    }
    else {
      router.history.back()
    }
  }

  const bookPrefix = pathname.split('/')[2]

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-40 h-11 lg:hidden',
          'bg-background border-b-2 border-border',
          'flex items-center justify-center',
          'motion-safe:transition-transform motion-safe:duration-300',
          isHidden && '-translate-y-full',
        )}
      >
        {config.showBack && backLabel && (
          <Button
            variant="ghost"
            onClick={handleBack}
            aria-label={`Back to ${backLabel}`}
            className="absolute left-1 flex items-center gap-0.5 text-muted-foreground h-11 px-2"
          >
            <ChevronLeft size={14} aria-hidden />
            <span className="font-[var(--br-mono-font)] text-[10px] uppercase">
              {backLabel}
            </span>
          </Button>
        )}

        <span className="font-[var(--br-mono-font)] text-[11px] font-bold uppercase tracking-widest">
          {config.title}
        </span>

        {config.showInfoIcon && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetOpen(true)}
            aria-label="Book info"
            className="absolute right-1 h-11 w-11"
          >
            <MoreVertical size={18} aria-hidden />
          </Button>
        )}
      </header>

      <FloatingBackButton
        visible={isHidden && !!config.showBack}
        onBack={handleBack}
        label={backLabel}
      />

      {config.showInfoIcon && bookPrefix && (
        <BookInfoSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          bookPrefix={bookPrefix}
        />
      )}
    </>
  )
}
