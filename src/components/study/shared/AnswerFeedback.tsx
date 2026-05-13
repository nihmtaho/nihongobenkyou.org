import type { SRSRating } from '../../../types/srs'
import { AnimatePresence, motion } from 'framer-motion'
import { formatIntervalPreview } from '../../../lib/srs-utils'

const RATING_LABELS: Record<SRSRating, string> = {
  1: '✗ AGAIN',
  2: 'HARD',
  3: '✓ GOOD',
  4: '✓ EASY',
}

const RATING_BADGE_CLASS: Record<SRSRating, string> = {
  1: 'badge-error',
  2: 'badge-warning',
  3: 'badge-success',
  4: 'badge-success',
}

interface AnswerFeedbackProps {
  rating: SRSRating
  intervalDays: number
  visible: boolean
}

export function AnswerFeedback({ rating, intervalDays, visible }: AnswerFeedbackProps) {
  const intervalLabel = rating === 1 ? '6-10min' : formatIntervalPreview(intervalDays)
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={`badge ${RATING_BADGE_CLASS[rating]} font-[var(--br-mono-font)] text-[11px] uppercase tracking-wider`}
        >
          {RATING_LABELS[rating]}
          {' · '}
          {intervalLabel}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
