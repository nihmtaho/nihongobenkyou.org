import type { CardState, FSRSResult, SRSCard, SRSRating } from '../types/srs'
import { fsrs, generatorParameters, Rating, State } from 'ts-fsrs'

const f = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }))

const STATE_MAP: Record<CardState, State> = {
  new:        State.New,
  learning:   State.Learning,
  review:     State.Review,
  relearning: State.Relearning,
}

const STATE_REVERSE: Record<State, CardState> = {
  [State.New]:        'new',
  [State.Learning]:   'learning',
  [State.Review]:     'review',
  [State.Relearning]: 'relearning',
}

export function scheduleFSRS(card: SRSCard, rating: SRSRating): FSRSResult {
  const fsrsCard = {
    due:            new Date(card.due),
    stability:      card.stability,
    difficulty:     card.difficulty,
    elapsed_days:   card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps:           card.reps,
    lapses:         card.lapses,
    state:          STATE_MAP[card.state],
    last_review:    new Date(card.last_review),
  }

  const now = new Date()
  const scheduling = f.repeat(fsrsCard, now)
  const next = scheduling[rating as Rating].card

  return {
    due:            next.due.toISOString().slice(0, 10),
    state:          STATE_REVERSE[next.state],
    stability:      next.stability,
    difficulty:     next.difficulty,
    elapsed_days:   next.elapsed_days,
    scheduled_days: next.scheduled_days,
    reps:           next.reps,
    lapses:         next.lapses,
    last_review:    now.toISOString().slice(0, 10),
  }
}

export function initFSRSCard(): Pick<SRSCard,
  'state' | 'stability' | 'difficulty' | 'elapsed_days' |
  'scheduled_days' | 'reps' | 'lapses' | 'last_review' | 'due'
> {
  const today = new Date().toISOString().slice(0, 10)
  return {
    state:          'new',
    stability:      0,
    difficulty:     0,
    elapsed_days:   0,
    scheduled_days: 0,
    reps:           0,
    lapses:         0,
    last_review:    today,
    due:            today,
  }
}

export function formatIntervalPreview(days: number): string {
  if (days <= 0)   return '< 1d'
  if (days < 30)   return `${days}d`
  if (days < 365)  return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}
