import type { SRSCard, SRSRating } from '../types/srs'

export function computeTypeInputRatingForDisplay(card: SRSCard, isCorrect: boolean): SRSRating {
  if (!isCorrect)
    return 1 // Again
  const consecutive = card.consecutive_correct ?? 0
  if (consecutive >= 4 && card.reps >= 2)
    return 4 // Easy
  if (card.reps <= 1)
    return 2 // Hard
  return 3 // Good
}

export { formatIntervalPreview } from './srs'
