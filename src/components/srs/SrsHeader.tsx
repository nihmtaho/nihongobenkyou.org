import type { SRSCard } from '@/types/srs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { computeRetrievability } from '@/lib/srs'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  current: number
  total: number
  elapsed: number
  srsMode: 'flashcard' | 'type-input'
  canUndo?: boolean
  onUndo?: () => void
  card?: SRSCard
}

export function SrsHeader({ current, total, elapsed, srsMode, canUndo = false, onUndo, card }: Props) {
  const padded = srsMode === 'type-input'

  useEffect(() => {
    if (!onUndo)
      return

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault()
        onUndo!()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, onUndo])

  const retrievabilityBadge = card && card.state !== 'new'
    ? (() => {
        const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(card.last_review).getTime()) / (1000 * 60 * 60 * 24)))
        const r = computeRetrievability(card.stability, elapsedDays)
        return r
      })()
    : null

  return (
    <>
      <div className={`flex items-center justify-between ${padded ? 'px-4' : ''}`}>
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-foreground/60">
          {current}
          {' '}
          /
          {total}
        </span>
        <div className="flex items-center gap-2">
          {retrievabilityBadge !== null && (
            <span className="font-[var(--br-mono-font)] text-[10px] uppercase text-foreground/50">
              {retrievabilityBadge}
              % nhớ
            </span>
          )}
          {onUndo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 font-[var(--br-mono-font)] text-[10px] uppercase text-foreground/60 disabled:opacity-30"
              disabled={!canUndo}
              onClick={onUndo}
              aria-label="Undo last rating"
            >
              ↩ UNDO
            </Button>
          )}
          <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-foreground/60">
            {formatTime(elapsed)}
          </span>
        </div>
      </div>
      <Progress
        className={`h-0.5 w-full ${padded ? 'px-4' : ''}`}
        value={total > 0 ? (current / total) * 100 : 0}
      />
    </>
  )
}
