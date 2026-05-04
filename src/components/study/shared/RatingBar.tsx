import type { KanjiCardState } from '../../../types/kanji'
import type { SRSRating } from '../../../types/srs'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { calculateNextReview } from '../../../lib/srs'
import { formatIntervalPreview, toCardState } from '../../../lib/srs-utils'
import { useAuthStore } from '../../../stores/authStore'

const RATING_LABELS: Record<SRSRating, string> = { 0: 'Again', 1: 'Hard', 2: 'Good', 3: 'Easy' }
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const

interface RatingBarProps {
  card?: VocabWithSRS | KanjiCardState
  onRate: (rating: SRSRating) => void
}

function getIntervalPreview(card: VocabWithSRS | KanjiCardState, userId: string, rating: SRSRating): string {
  if (rating === 0) return '6–10 min'
  const state = toCardState(card, userId)
  const result = calculateNextReview(state, rating)
  return formatIntervalPreview(result.new_interval)
}

export function RatingBar({ card, onRate }: RatingBarProps) {
  const userId = useAuthStore(s => s.userId) ?? ''

  return (
    <ButtonGroup className="w-full">
      {([0, 1, 2, 3] as SRSRating[]).map((r) => (
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
        </Button>
      ))}
    </ButtonGroup>
  )
}
