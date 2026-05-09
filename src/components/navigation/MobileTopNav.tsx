import { useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useScrollDirection } from '@/hooks/useScrollDirection'
import { useScrollY } from '@/hooks/useScrollY'
import { datasets } from '@/lib/datasets.config'
import { getBackLabel, getNavConfig } from '@/lib/nav-config'
import { cn } from '@/lib/utils'
import { BookInfoSheet } from './BookInfoSheet'
import { FloatingBackButton } from './FloatingBackButton'

// Scroll thresholds for book detail expanded header (px)
const COMPACT_AT = 70 // expanded content fully collapsed
const SLIDE_START = 90 // nav starts sliding off-screen
const SLIDE_END = 160 // nav fully hidden

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1)
}

interface MarqueeTitleProps {
  text: string
  active: boolean
}

function MarqueeTitle({ text, active }: MarqueeTitleProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const inner = innerRef.current
    const wrap = wrapRef.current
    if (!active || !wrap || !inner)
      return
    const overflow = inner.scrollWidth - wrap.offsetWidth
    if (overflow > 0) {
      inner.style.setProperty('--marquee-offset', `-${overflow}px`)
      inner.style.animation = 'nav-marquee 5s linear infinite alternate'
    }
    return () => {
      inner.style.animation = ''
      inner.style.removeProperty('--marquee-offset')
    }
  }, [active])

  return (
    <div ref={wrapRef} className="overflow-hidden max-w-[130px]">
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap font-[var(--br-mono-font)] text-[10px] font-bold uppercase tracking-widest"
      >
        {text}
      </span>
    </div>
  )
}

export function MobileTopNav() {
  const { location } = useRouterState()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const scrollDir = useScrollDirection()
  const scrollY = useScrollY()

  const pathname = location.pathname
  const config = getNavConfig(pathname)

  if (!config || config.hideNav)
    return null

  if (!config.showBack && !config.showInfoIcon && !config.hasExpandedHeader)
    return null

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

  // ── Expanded header (book detail) ──
  const bookId = pathname.split('/')[2]
  const isExpandedRoute = !!config.hasExpandedHeader
  const dataset = isExpandedRoute ? datasets.find(d => d.id === bookId) : undefined

  if (isExpandedRoute && dataset) {
    return (
      <BookDetailNav
        dataset={dataset}
        bookId={bookId}
        scrollY={scrollY}
        scrollDir={scrollDir}
        onBack={handleBack}
        backLabel={backLabel ?? 'BOOKS'}
        sheetOpen={sheetOpen}
        onSheetOpen={setSheetOpen}
      />
    )
  }

  // ── Standard nav ──
  const isHidden = scrollDir === 'down'

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
            onClick={handleBack}
            aria-label={`Back to ${backLabel}`}
            className="absolute left-2 px-3 gap-1 [box-shadow:3px_3px_0_var(--btn-shadow)] active:translate-x-[3px] active:translate-y-[3px] active:[box-shadow:none]"
            size="xs"
          >
            <ChevronLeft size={14} aria-hidden />
            <span className="font-[var(--br-mono-font)] text-[10px] uppercase">{backLabel}</span>
          </Button>
        )}

        <span className="font-[var(--br-mono-font)] text-[11px] font-bold uppercase tracking-widest">
          {config.title}
        </span>

        {config.showInfoIcon && (
          <Button
            size="icon-lg"
            onClick={() => setSheetOpen(true)}
            aria-label="Book info"
            className="absolute right-1"
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

      {config.showInfoIcon && bookId && (
        <BookInfoSheet open={sheetOpen} onOpenChange={setSheetOpen} bookPrefix={bookId} />
      )}
    </>
  )
}

interface BookDetailNavProps {
  dataset: typeof datasets[number]
  bookId: string
  scrollY: number
  scrollDir: 'up' | 'down' | 'top'
  onBack: () => void
  backLabel: string
  sheetOpen: boolean
  onSheetOpen: (open: boolean) => void
}

function BookDetailNav({
  dataset,
  bookId,
  scrollY,
  scrollDir,
  onBack,
  backLabel,
  sheetOpen,
  onSheetOpen,
}: BookDetailNavProps) {
  // Collapse ratio: 1 = fully expanded, 0 = fully compact
  const collapseRatio = clamp(1 - scrollY / COMPACT_AT, 0, 1)

  // Expanded content height: 84px → 0
  const expandedH = Math.round(84 * collapseRatio)

  // Title font size: 22px → 14px
  const titleFontSize = lerp(14, 22, collapseRatio)

  // Subtitle + badges opacity: fade out by 70% of COMPACT_AT
  const subOpacity = clamp(1 - scrollY / (COMPACT_AT * 0.7), 0, 1)

  // Compact title: hidden when expanded, fades in as nav shrinks
  // Starts at 30% collapse, fully visible at 90%
  const titleOpacity = clamp((1 - collapseRatio - 0.3) / 0.6, 0, 1)
  const titleActive = titleOpacity > 0.9

  // Nav slide: only when scrolled past SLIDE_START and scrolling down
  const isHidden = scrollY > SLIDE_START && scrollDir === 'down'
  const isFloatingBackVisible = isHidden && scrollY > SLIDE_END

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-40 lg:hidden',
          'bg-background border-b-2 border-border',
          'overflow-hidden',
          'motion-safe:transition-transform motion-safe:duration-300',
          isHidden && '-translate-y-full',
        )}
      >
        {/* Compact row — always 64px */}
        <div className="h-11 flex items-center justify-center relative">
          <Button
            size="xs"
            onClick={onBack}
            aria-label={`Back to ${backLabel}`}
            className="absolute left-2 px-3 gap-1"
          >
            <ChevronLeft size={14} aria-hidden />
            <span className="font-[var(--br-mono-font)] text-[10px] uppercase">{backLabel}</span>
          </Button>

          {/* Title: hidden when fully expanded, appears when compact */}
          <div style={{ opacity: titleOpacity }}>
            <MarqueeTitle text={dataset.title.toUpperCase()} active={titleActive} />
          </div>

          <Button
            onClick={() => onSheetOpen(true)}
            aria-label="Book info"
            className="absolute right-1"
            size="icon-sm"
          >
            <MoreVertical size={18} aria-hidden />
          </Button>
        </div>

        {/* Expanded content — collapses on scroll */}
        <div
          style={{ height: expandedH, opacity: collapseRatio }}
          className="overflow-hidden px-4"
        >
          <p
            className="font-[var(--br-heading-font)] font-black uppercase leading-none"
            style={{ fontSize: titleFontSize }}
          >
            {dataset.title.toUpperCase()}
          </p>
          <p
            className="font-[var(--br-jp-font)] text-[11px] text-muted-foreground mt-0.5"
            style={{ opacity: subOpacity }}
          >
            {dataset.title_vi}
          </p>
          <div className="flex gap-2 mt-1.5" style={{ opacity: subOpacity }}>
            <span className="font-[var(--br-mono-font)] text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5">
              {`N${dataset.jlpt_level}`}
            </span>
            <span className="font-[var(--br-mono-font)] text-[9px] border border-border px-1.5 py-0.5">
              {`L${dataset.lesson_range[0]}–${dataset.lesson_range[1]}`}
            </span>
          </div>
        </div>
      </header>

      <FloatingBackButton
        visible={isFloatingBackVisible}
        onBack={onBack}
        label={backLabel}
      />

      <BookInfoSheet open={sheetOpen} onOpenChange={onSheetOpen} bookPrefix={bookId} />
    </>
  )
}
