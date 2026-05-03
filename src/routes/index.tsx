import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { DueCardsWidget } from '../components/home/DueCardsWidget'
import { LearningAnalyticsWidget } from '../components/home/LearningAnalyticsWidget'
import { RetentionWidget } from '../components/home/RetentionWidget'
import { ReviewActivityWidget } from '../components/home/ReviewActivityWidget'
import { ReviewForecastWidget } from '../components/home/ReviewForecastWidget'
import { StreakWidget } from '../components/home/StreakWidget'
import { useDueCards } from '../hooks/useDueCards'
import { useAuthStore } from '../stores/authStore'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const { data: dueCards } = useDueCards(userId)
  const dueCount = dueCards?.length ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="p-4 lg:p-8"
    >
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10 lg:items-start">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-6">

          {/* Masthead */}
          <div className="flex flex-col gap-1">
            <h1 className="text-7xl lg:text-[6rem] xl:text-[7rem] font-black font-[var(--br-heading-font)] tracking-tighter leading-none">
              NIHONGO.
            </h1>
            <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
              NHẬT NGỮ · HỌC MỖI NGÀY
            </p>
          </div>

          {/* Quick start */}
          <Button
            asChild
            size="lg"
            className="font-[var(--br-heading-font)] uppercase tracking-wide w-full lg:w-auto lg:self-start"
          >
            <Link to="/study" search={{ tab: undefined }}>
              {dueCount > 0
                ? `ÔN TẬP NGAY · ${dueCount} THẺ`
                : 'BẮT ĐẦU HỌC'}
            </Link>
          </Button>

          {/* Divider */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">CHI TIẾT</span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>

          {/* 2-col row: Due cards + Retention */}
          <div className="grid grid-cols-2 gap-4">
            <DueCardsWidget userId={userId} />
            <RetentionWidget userId={userId} />
          </div>

          {/* Review activity (improved 7-day chart) */}
          <ReviewActivityWidget userId={userId} />

          {/* Upcoming review forecast */}
          <ReviewForecastWidget userId={userId} />

          {/* Learning progress */}
          <LearningAnalyticsWidget userId={userId} />

          {/* Mobile-only: streak */}
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="h-px bg-foreground/10 my-0 opacity-20" />
            <StreakWidget userId={userId} />
          </div>
        </div>

        {/* ── Right column (desktop only) ── */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-8">
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
            TIẾN ĐỘ HÔM NAY
          </p>
          <StreakWidget userId={userId} />

          {/* Quick-access links */}
          <div className="flex flex-col gap-1.5 mt-2">
            <Button variant="outline" size="sm" asChild className="font-[var(--br-mono-font)] justify-start gap-2">
              <Link to="/srs">
                <span>◈</span>
                {' '}
                Ôn tập từ vựng
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="font-[var(--br-mono-font)] justify-start gap-2">
              <Link to="/kanji/review">
                <span className="font-[var(--br-jp-font)]">字</span>
                {' '}
                Ôn tập hán tự
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="font-[var(--br-mono-font)] justify-start gap-2 text-muted-foreground">
              <Link to="/books">
                <span>◫</span>
                {' '}
                Khám phá bài học
              </Link>
            </Button>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
