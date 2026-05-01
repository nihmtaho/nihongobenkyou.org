import type { SRSRating } from '../../../types/srs'

const RATING_LABELS: Record<SRSRating, string> = { 0: 'Again', 1: 'Hard', 2: 'Good', 3: 'Easy' }
const RATING_CLASSES: Record<SRSRating, string> = {
  0: 'btn-error',
  1: 'btn-warning',
  2: 'btn-success',
  3: 'btn-info',
}

interface RatingBarProps {
  onRate: (rating: SRSRating) => void
}

export function RatingBar({ onRate }: RatingBarProps) {
  return (
    <div className="join w-full">
      {([0, 1, 2, 3] as SRSRating[]).map((r, idx) => (
        <button
          key={r}
          type="button"
          className={`btn join-item flex-1 ${RATING_CLASSES[r]} font-[var(--br-mono-font)] text-[11px] flex flex-col gap-0.5 py-2`}
          onClick={(e) => {
            e.stopPropagation()
            onRate(r)
          }}
        >
          <span className="font-bold">{RATING_LABELS[r]}</span>
          <span className="opacity-50 text-[9px]">{`[${idx + 1}]`}</span>
        </button>
      ))}
    </div>
  )
}
