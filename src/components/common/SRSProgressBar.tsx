import { motion } from 'framer-motion'

export interface SRSStats {
  total: number
  new: number
  learning: number
  review: number
  mature: number
}

function segmentPct(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0
}

export function SRSProgressBar({
  stats,
  height = 'h-2',
  animDelay = 0,
}: {
  stats: SRSStats
  height?: string
  animDelay?: number
}) {
  const { total, learning, review, mature } = stats

  return (
    <div className={`flex ${height} w-full bg-base-300 overflow-hidden`}>
      <motion.div
        className="bg-warning h-full flex-none"
        style={{ transformOrigin: 'left', width: `${segmentPct(learning, total)}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: animDelay }}
      />
      <motion.div
        className="bg-info h-full flex-none"
        style={{ transformOrigin: 'left', width: `${segmentPct(review, total)}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: animDelay + 0.08 }}
      />
      <motion.div
        className="bg-success h-full flex-none"
        style={{ transformOrigin: 'left', width: `${segmentPct(mature, total)}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: animDelay + 0.16 }}
      />
    </div>
  )
}
