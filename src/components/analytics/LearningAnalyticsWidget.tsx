import type { SubjectStats } from '../../hooks/useLearningStats'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useLearningStats } from '../../hooks/useLearningStats'
import { useTranslation } from '../../hooks/useTranslation'
import { formatNextReview } from '../../lib/next-review'

type StatKey = 'new' | 'learning' | 'review' | 'mature'

interface StatMeta {
  key: StatKey
  label: string
}

interface LegendItem {
  key: StatKey
  label: string
  dotClass: string
}

const STAT_META: StatMeta[] = [
  { key: 'new', label: 'srs.new' },
  { key: 'learning', label: 'srs.learning' },
  { key: 'review', label: 'srs.review' },
  { key: 'mature', label: 'srs.mature' },
]

const COUNT_COLORS: Record<StatKey, string> = {
  new: 'text-foreground/50',
  learning: 'text-warning',
  review: 'text-info',
  mature: 'text-success',
}

const LEGEND_ITEMS: LegendItem[] = [
  { key: 'new', label: 'srs.new.legend', dotClass: 'bg-secondary border border-foreground/20' },
  { key: 'learning', label: 'srs.learning.legend', dotClass: 'bg-warning' },
  { key: 'review', label: 'srs.review.legend', dotClass: 'bg-info' },
  { key: 'mature', label: 'srs.mature.legend', dotClass: 'bg-success' },
]

function AnimatedNumber({ value, delay = 0 }: { value: number, delay?: number }) {
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v: number) => String(Math.round(v)))

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      delay,
    })
    return () => controls.stop()
  }, [value, mv, delay])

  return <motion.span>{display}</motion.span>
}

function pct(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0
}

function SubjectRow({
  label,
  stats,
  animDelay = 0,
}: {
  label: string
  stats: SubjectStats
  animDelay?: number
}) {
  const { t } = useTranslation()
  const { total, learning, review, mature } = stats
  const learningPct = pct(learning, total)
  const reviewPct = pct(review, total)
  const maturePct = pct(mature, total)
  const now = useMemo(() => new Date().toISOString(), [])
  const nextReview = stats.nextDueDate ? formatNextReview([stats.nextDueDate], now) : null

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-[0.18em] text-foreground/50">
        {label}
      </span>

      {/* Stacked progress bar — bg-secondary is the "new/unseen" fill */}
      <div className="flex h-3 w-full bg-secondary overflow-hidden">
        <motion.div
          className="bg-warning h-full flex-none"
          style={{ transformOrigin: 'left', width: `${learningPct}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: animDelay }}
        />
        <motion.div
          className="bg-info h-full flex-none"
          style={{ transformOrigin: 'left', width: `${reviewPct}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: animDelay + 0.09 }}
        />
        <motion.div
          className="bg-success h-full flex-none"
          style={{ transformOrigin: 'left', width: `${maturePct}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: animDelay + 0.18 }}
        />
      </div>

      {/* Stat counters */}
      <div className="grid grid-cols-4">
        {STAT_META.map(({ key, label: statLabel }, i) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span
              className={`text-xl font-[var(--br-mono-font)] font-bold leading-none tabular-nums ${COUNT_COLORS[key]}`}
            >
              <AnimatedNumber value={stats[key]} delay={animDelay + i * 0.06} />
            </span>
            <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 tracking-wide leading-tight mt-0.5">
              {t(statLabel)}
            </span>
          </div>
        ))}
      </div>

      {nextReview && (
        <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 text-right leading-none">
          {t('review.next')}
          {' '}
          {nextReview}
        </p>
      )}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-2.5 w-16 bg-secondary animate-pulse" />
      <div className="h-3 w-full bg-secondary animate-pulse" />
      <div className="grid grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-6 w-8 bg-secondary animate-pulse" />
            <div className="h-2 w-12 bg-secondary animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LearningAnalyticsWidget({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const { data: stats, isLoading } = useLearningStats(userId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
      className="bg-card border border-border/10 overflow-hidden"
    >
      <div className="h-[3px] bg-primary w-full" />

      <div className="p-4 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[11px] font-[var(--br-mono-font)] font-bold uppercase tracking-[0.22em] text-foreground">
            {t('analytics.title')}
          </span>
          {isLoading
            ? <div className="h-2.5 w-28 bg-secondary animate-pulse" />
            : stats && (
              <span className="text-[10px] font-[var(--br-mono-font)] text-foreground/40">
                {stats.vocab.total}
                {' '}
                {t('unit.vocab')}
                {' '}
                ·
                {' '}
                {stats.kanji.total}
                {' '}
                {t('unit.kanji')}
              </span>
            )}
        </div>

        {/* Vocabulary section */}
        {isLoading
          ? <SkeletonRow />
          : stats && <SubjectRow label={t('subject.vocab')} stats={stats.vocab} animDelay={0.15} />}

        <div className="h-px bg-foreground/10" />

        {/* Kanji section */}
        {isLoading
          ? <SkeletonRow />
          : stats && <SubjectRow label={t('subject.kanji')} stats={stats.kanji} animDelay={0.38} />}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5 border-t border-foreground/10">
          {LEGEND_ITEMS.map(({ key, label, dotClass }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 inline-block flex-none ${dotClass}`} />
              <span className="text-[9px] font-[var(--br-mono-font)] uppercase text-foreground/40 tracking-wide">
                {t(label)}
              </span>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  )
}
