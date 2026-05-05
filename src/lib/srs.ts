import type { CardStage, CardState, ReviewResult, SRSRating } from '../types/srs'

export const AGAIN_DELAY_MIN_MS = 6 * 60 * 1000
export const AGAIN_DELAY_MAX_MS = 10 * 60 * 1000

const LEARNING_STEP_DELAYS_MS = [
  1 * 60 * 1000, // step 0: 1 min
  10 * 60 * 1000, // step 1: 10 min
  24 * 60 * 60 * 1000, // step 2: 1 day
]

const MIN_EASE = 1.3
const MAX_INTERVAL = 180
const DEFAULT_EASE = 2.5

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

function graduateCard(rating: SRSRating, card: CardState): ReviewResult {
  const interval = rating === 3 ? 4 : 1
  return {
    vocab_id: card.vocabId,
    new_interval: interval,
    new_ease: card.ease_factor ?? DEFAULT_EASE,
    due_date: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
    new_card_stage: 'review',
    new_learning_step: 0,
    new_lapse_count: card.lapse_count ?? 0,
  }
}

function handleLearningStep(card: CardState, rating: SRSRating): ReviewResult {
  const step = card.learning_step ?? 0
  const stage = card.card_stage as CardStage

  if (rating === 3)
    return graduateCard(3, card)

  if (rating === 2 && step >= 2)
    return graduateCard(2, card)

  let nextStep: number
  if (rating === 0) {
    nextStep = 0
  }
  else if (rating === 1) {
    nextStep = step // Hard: stay at same step
  }
  else {
    nextStep = step + 1
  }

  const dueMs = Date.now() + LEARNING_STEP_DELAYS_MS[nextStep]

  return {
    vocab_id: card.vocabId,
    new_interval: 1,
    new_ease: card.ease_factor ?? DEFAULT_EASE,
    due_date: new Date(dueMs).toISOString(),
    new_card_stage: stage,
    new_learning_step: nextStep,
    new_lapse_count: card.lapse_count ?? 0,
  }
}

export function calculateNextReview(card: CardState, rating: SRSRating): ReviewResult {
  const stage = card.card_stage ?? 'review'
  const ease = card.ease_factor ?? DEFAULT_EASE

  if (stage === 'learning' || stage === 'relearning') {
    return handleLearningStep(card, rating)
  }

  // Review stage — standard SM-2
  if (rating === 0) {
    return {
      vocab_id: card.vocabId,
      new_interval: 1,
      new_ease: Math.max(MIN_EASE, ease - 0.2),
      due_date: new Date(Date.now() + randomAgainDelay()).toISOString(),
      new_card_stage: 'relearning',
      new_learning_step: 0,
      new_lapse_count: (card.lapse_count ?? 0) + 1,
    }
  }

  let interval: number
  let newEase = ease

  switch (rating) {
    case 1:
      interval = Math.max(1, Math.floor(card.interval_days * 1.2))
      newEase = Math.max(MIN_EASE, ease - 0.15)
      break
    case 2:
      interval = Math.max(1, Math.round(card.interval_days * ease))
      break
    case 3:
      interval = Math.max(1, Math.round(card.interval_days * ease * 1.3))
      newEase = ease + 0.15
      break
  }

  interval = Math.min(interval!, MAX_INTERVAL)

  return {
    vocab_id: card.vocabId,
    new_interval: interval,
    new_ease: newEase,
    due_date: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
    new_card_stage: 'review',
    new_learning_step: 0,
    new_lapse_count: card.lapse_count ?? 0,
  }
}
