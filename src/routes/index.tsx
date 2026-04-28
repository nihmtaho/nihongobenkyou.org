import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { DueCardsWidget } from '../components/home/DueCardsWidget'
import { LearningAnalyticsWidget } from '../components/home/LearningAnalyticsWidget'
import { StreakWidget } from '../components/home/StreakWidget'
import { useDueCards } from '../hooks/useDueCards'
import { useAuthStore } from '../stores/authStore'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const { data: dueCards } = useDueCards(userId)
  const hasDueCards = (dueCards?.length ?? 0) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="p-4 lg:p-8"
    >
      {/* Desktop: two-column grid. Mobile: single column. */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-6">

          {/* Masthead */}
          <div className="flex flex-col gap-1">
            <h1 className="text-7xl lg:text-[6rem] xl:text-[7rem] font-black font-[var(--br-heading-font)] tracking-tighter leading-none">
              NIHONGO.
            </h1>
            <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
              NHẬT NGỮ · HỌC MỖI NGÀY
            </p>
          </div>

          {/* Quick start — primary CTA */}
          <Link
            to={hasDueCards ? '/srs' : '/books'}
            className="btn btn-primary btn-lg font-[var(--br-heading-font)] uppercase tracking-wide w-full lg:w-auto lg:self-start"
          >
            {hasDueCards
              ? `ÔN TẬP NGAY · ${dueCards?.length} THẺ`
              : 'BẮT ĐẦU HỌC'}
          </Link>

          {/* Divider with label — desktop only */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="h-px flex-1 bg-base-content/10" />
            <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">PHÂN TÍCH</span>
            <div className="h-px flex-1 bg-base-content/10" />
          </div>

          {/* Learning analytics */}
          <LearningAnalyticsWidget userId={userId} />

          {/* Mobile-only: widgets below kanji */}
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="divider my-0 opacity-20" />
            <DueCardsWidget userId={userId} />
            <StreakWidget userId={userId} />
          </div>
        </div>

        {/* ── Right column (desktop only) ── */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-8">
          {/* Section label */}
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-widest">
            TIẾN ĐỘ HÔM NAY
          </p>
          <DueCardsWidget userId={userId} />
          <StreakWidget userId={userId} />
        </div>

      </div>
    </motion.div>
  )
}
