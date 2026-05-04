import type { CardState, ReviewResult, SRSRating } from '../types/srs'

export const AGAIN_DELAY_MIN_MS = 6 * 60 * 1000
export const AGAIN_DELAY_MAX_MS = 10 * 60 * 1000
const HARD_FIRST_DELAY_MS = 2 * 60 * 60 * 1000 // 2 hours
const DAY_MS = 24 * 60 * 60 * 1000

export function randomAgainDelay(): number {
  return (
    Math.floor(Math.random() * (AGAIN_DELAY_MAX_MS - AGAIN_DELAY_MIN_MS + 1))
    + AGAIN_DELAY_MIN_MS
  )
}

export function formatIntervalPreview(days: number): string {
  if (days <= 0)
    return '< 1d'
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
  // interval: stored for SM-2 calculation on the next review
  // daysAhead: day count used to compute dueMs for non-sub-day ratings
  let interval = 1
  let daysAhead = 0
  let ease = card.ease_factor ?? DEFAULT_EASE

  let dueMs: number

  if (rating === 0) {
    // Again: due in 6-10 min (widget shows countdown, not "DUE")
    ease = Math.max(MIN_EASE, ease - 0.2)
    dueMs = Date.now() + randomAgainDelay()
  }
  else if (isFirstReview) {
    if (rating === 3) {
      interval = 3
      daysAhead = 3
    }
    else if (rating === 2) {
      daysAhead = 1
    }
    // Hard first: interval=1, daysAhead=0 — store actual 2h delay
    dueMs = rating === 1 ? Date.now() + HARD_FIRST_DELAY_MS : Date.now() + daysAhead * DAY_MS
  }
  else {
    switch (rating) {
      case 1:
        interval = Math.max(1, Math.floor(card.interval_days * 1.2))
        ease = Math.max(MIN_EASE, ease - 0.15)
        daysAhead = interval
        break
      case 2:
        interval = Math.max(1, Math.round(card.interval_days * ease))
        daysAhead = interval
        break
      case 3:
        interval = Math.max(1, Math.round(card.interval_days * ease * 1.3))
        ease = ease + 0.15
        daysAhead = interval
        break
    }
    dueMs = Date.now() + daysAhead * DAY_MS
  }

  interval = Math.min(interval, MAX_INTERVAL)

  return {
    vocab_id: card.vocabId,
    new_interval: interval,
    new_ease: ease,
    due_date: new Date(dueMs).toISOString(),
  }
}
