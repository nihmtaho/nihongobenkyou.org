import type { CardState, ReviewResult, SRSRating } from '../types/srs'

export const AGAIN_DELAY_MIN_MS = 6 * 60 * 1000
export const AGAIN_DELAY_MAX_MS = 10 * 60 * 1000

export function randomAgainDelay(): number {
  return (
    Math.floor(Math.random() * (AGAIN_DELAY_MAX_MS - AGAIN_DELAY_MIN_MS + 1))
    + AGAIN_DELAY_MIN_MS
  )
}

export function formatIntervalPreview(days: number): string {
  if (days <= 0)
    return '< 1d'
  if (days === 1)
    return '1d'
  if (days < 30)
    return `${days}d`
  if (days < 365)
    return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}

const MIN_EASE = 1.3
const MAX_INTERVAL = 180
const DEFAULT_EASE = 2.5

export function calculateNextReview(card: CardState, rating: SRSRating): ReviewResult {
  const isFirstReview = card.review_count === 0
  let interval: number
  let ease = card.ease_factor ?? DEFAULT_EASE

  if (isFirstReview) {
    interval = rating === 3 ? 4 : 1
  }
  else {
    switch (rating) {
      case 0:
        interval = 1
        ease = Math.max(MIN_EASE, ease - 0.2)
        break
      case 1:
        interval = Math.max(1, Math.floor(card.interval_days * 1.2))
        ease = Math.max(MIN_EASE, ease - 0.15)
        break
      case 2:
        interval = Math.max(1, Math.round(card.interval_days * ease))
        break
      case 3:
        interval = Math.max(1, Math.round(card.interval_days * ease * 1.3))
        ease = ease + 0.15
        break
    }
  }

  interval = Math.min(interval, MAX_INTERVAL)

  const due = new Date()
  due.setDate(due.getDate() + interval)

  return {
    vocab_id: card.vocabId,
    new_interval: interval,
    new_ease: ease,
    due_date: due.toISOString().slice(0, 10),
  }
}
