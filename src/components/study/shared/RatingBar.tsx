import type { KanjiCardState } from '../../../types/kanji'
import type { SRSRating } from '../../../types/srs'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { calculateNextReview } from '../../../lib/srs'
import { formatIntervalPreview, toCardState } from '../../../lib/srs-utils'
import { useAuthStore } from '../../../stores/authStore'

const RATING_LABELS: Record<SRSRating, string> = { 0: 'Again', 1: 'Hard', 2: 'Good', 3: 'Easy' }
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = isMac ? '⌘' : 'Ctrl'

interface RatingBarProps {
  card?: VocabWithSRS | KanjiCardState
  onRate: (rating: SRSRating) => void
  correct?: boolean
}

function getIntervalPreview(card: VocabWithSRS | KanjiCardState, userId: string, rating: SRSRating): string {
  if (rating === 0)
    return '6–10 min'
  const state = toCardState(card, userId)
  if (rating === 1 && state.review_count === 0)
    return '2h'
  const result = calculateNextReview(state, rating)
  return formatIntervalPreview(result.new_interval)
}

export function RatingBar({ card, onRate, correct }: RatingBarProps) {
  const userId = useAuthStore(s => s.userId) ?? ''

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey))
        return
      const rating = ({ 1: 0, 2: 1, 3: 2, 4: 3 } as Record<string, SRSRating>)[e.key]
      if (rating === undefined)
        return
      e.preventDefault()
      onRate(rating)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onRate])

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {correct !== undefined && (
        <p className={`text-center text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest ${correct ? 'text-success' : 'text-destructive'}`}>
          {correct ? '✓ Đúng' : '✗ Sai'}
        </p>
      )}
      <ButtonGroup className="w-full">
        {([0, 1, 2, 3] as SRSRating[]).map(r => (
          <Button
            key={r}
            type="button"
            variant={RATING_VARIANTS[r]}
            className="flex-1 font-[var(--br-mono-font)] text-[11px] flex flex-col gap-0.5 py-2 h-auto"
            onClick={(e) => {
              e.stopPropagation()
              onRate(r)
            }}
          >
            <span className="font-bold">{RATING_LABELS[r]}</span>
            <span className="opacity-60 text-[9px]">
              {card !== undefined ? getIntervalPreview(card, userId, r) : r === 0 ? '6–10 min' : '--'}
            </span>
            <span className="opacity-30 text-[8px]">
              {MOD}
              +
              {r + 1}
            </span>
          </Button>
        ))}
      </ButtonGroup>
    </div>
  )
}
