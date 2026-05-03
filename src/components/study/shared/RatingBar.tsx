import type { SRSRating } from '../../../types/srs'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

const RATING_LABELS: Record<SRSRating, string> = { 0: 'Again', 1: 'Hard', 2: 'Good', 3: 'Easy' }
const RATING_VARIANTS = ['destructive', 'warning', 'success', 'info'] as const

interface RatingBarProps {
  onRate: (rating: SRSRating) => void
}

export function RatingBar({ onRate }: RatingBarProps) {
  return (
    <ButtonGroup className="w-full">
      {([0, 1, 2, 3] as SRSRating[]).map((r, idx) => (
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
          <span className="opacity-50 text-[9px]">{`[${idx + 1}]`}</span>
        </Button>
      ))}
    </ButtonGroup>
  )
}
