import type { SRSCard, SRSRating } from '../../../types/srs'
import type { VocabWithSRS } from '../../../types/vocabulary'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { useStudyKeyboard } from '../../../hooks/useStudyKeyboard'
import { scheduleFSRS } from '../../../lib/srs'
import { formatIntervalPreview } from '../../../lib/srs-utils'

const RATING_LABELS: Record<SRSRating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const

interface RatingBarProps {
  card?: SRSCard | VocabWithSRS
  onRate: (rating: SRSRating) => void
  correct?: boolean
  phase?: string
}

function getIntervalPreview(card: SRSCard | VocabWithSRS, rating: SRSRating): string {
  // Again on a review card: show approximation to avoid random fuzz noise
  if (rating === 1 && card.state === 'review')
    return '6–10 min'
  const result = scheduleFSRS(card as SRSCard, rating)
  if (result.state === 'learning' || result.state === 'relearning') {
    const ms = new Date(result.due_datetime).getTime() - Date.now()
    if (ms < 60 * 60 * 1000)
      return `${Math.round(ms / 60000)} min`
    if (ms < 24 * 60 * 60 * 1000)
      return `${Math.round(ms / 3600000)}h`
    return formatIntervalPreview(Math.round(ms / (24 * 60 * 60 * 1000)))
  }
  return formatIntervalPreview(result.scheduled_days)
}

export function RatingBar({ card, onRate, correct, phase = 'reviewing' }: RatingBarProps) {
  useStudyKeyboard(phase, onRate)

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {correct !== undefined && (
        <p className={`text-center text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest ${correct ? 'text-success' : 'text-destructive'}`}>
          {correct ? '✓ Đúng' : '✗ Sai'}
        </p>
      )}
      <ButtonGroup className="w-full">
        {([1, 2, 3, 4] as SRSRating[]).map(r => (
          <Button
            key={r}
            type="button"
            variant={RATING_VARIANTS[r - 1]}
            className="flex-1 font-[var(--br-mono-font)] text-[11px] flex flex-col gap-0.5 py-2 h-auto"
            onClick={(e) => {
              e.stopPropagation()
              onRate(r)
            }}
          >
            <span className="font-bold">{RATING_LABELS[r]}</span>
            <span className="opacity-60 text-[9px]">
              {card !== undefined ? getIntervalPreview(card, r) : r === 1 ? '6–10 min' : '--'}
            </span>
            <span className="opacity-30 text-[8px]">{r}</span>
          </Button>
        ))}
      </ButtonGroup>
    </div>
  )
}
