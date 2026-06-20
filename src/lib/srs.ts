import type { FSRS, Grade } from 'ts-fsrs'
import type { CardState, FSRSResult, SRSCard, SRSRating } from '../types/srs'
import { fsrs, generatorParameters, State } from 'ts-fsrs'

export function createFSRS(retention: number): FSRS {
  return fsrs(generatorParameters({ enable_fuzz: true, request_retention: retention }))
}

const f = createFSRS(0.9)

export const STATE_MAP: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

export const STATE_REVERSE: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

export function scheduleFSRS(card: SRSCard, rating: SRSRating): FSRSResult {
  const fsrsCard = {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_MAP[card.state],
    last_review: new Date(card.last_review),
  }

  const now = new Date()
  const scheduling = f.repeat(fsrsCard, now)
  // SRSRating is 1|2|3|4 which maps exactly to Grade (Again|Hard|Good|Easy)
  const next = scheduling[rating as Grade].card

  return {
    due: next.due.toISOString().slice(0, 10),
    due_datetime: next.due.toISOString(),
    state: STATE_REVERSE[next.state],
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    last_review: now.toISOString().slice(0, 10),
  }
}

export function initFSRSCard(): Pick<SRSCard, 'state' | 'stability' | 'difficulty' | 'elapsed_days'
  | 'scheduled_days' | 'reps' | 'lapses' | 'last_review' | 'due'> {
  const today = new Date().toISOString().slice(0, 10)
  return {
    state: 'new',
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    last_review: today,
    due: today,
  }
}

export function computeRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0)
    return 100
  return Math.round(0.9 ** (elapsedDays / stability) * 100)
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
