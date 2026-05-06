import type { CardTypeFilter } from '../../../types/unified-card'

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActiveDeckKanjiSection, ActiveDeckVocabSection } from '../../../components/active-deck/ActiveDeckSection'
import { SrsGuideDialog } from '../../../components/study/SrsGuideDialog'
import { useNow } from '../../../hooks/useNow'
import { useStreak } from '../../../hooks/useStreak'
import { useUnifiedDueStats } from '../../../hooks/useUnifiedDueStats'
import { formatCountdown } from '../../../lib/format-countdown'
import { useAuthStore } from '../../../stores/authStore'

export const Route = createFileRoute('/_authenticated/study/')({
  component: StudyDashboardPage,
})

const FILTER_LABELS: Record<CardTypeFilter, string> = {
  all: 'TẤT CẢ',
  vocab: '単語',
  kanji: '漢字',
  decks: 'デッキ',
}

function StudyDashboardPage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const navigate = useNavigate()
  const [filter, setFilter] = useState<CardTypeFilter>('all')
  const [guideOpen, setGuideOpen] = useState(false)
  const { data: stats, isLoading } = useUnifiedDueStats(userId)
  const { data: streak } = useStreak(userId)
  const nowMs = useNow(30_000)

  const dueCount = stats
    ? filter === 'vocab'
      ? stats.vocabDue
      : filter === 'kanji'
        ? stats.kanjiDue
        : filter === 'decks'
          ? 0
          : stats.dueToday
    : 0

  function startReview() {
    navigate({ to: '/study/review', search: { filter } })
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/10">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
              STUDY
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground h-7 px-2"
                onClick={() => setGuideOpen(true)}
              >
                ? Hướng dẫn
              </Button>
              {streak && streak.current_streak > 0 && (
                <div className="flex items-center gap-1 text-warning">
                  <span className="text-lg">🔥</span>
                  <span className="font-black text-xl">{streak.current_streak}</span>
                  <span className="text-[9px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground">
                    NGÀY
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {isLoading
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={`stat-skeleton-${i}`} className="h-12" />)
              : [
                  { label: 'ĐẾN HẠN', value: stats?.dueToday ?? 0, color: 'text-destructive' },
                  { label: 'ĐANG HỌC', value: stats?.learning ?? 0, color: 'text-warning' },
                  { label: 'ÔN TẬP', value: stats?.review ?? 0, color: 'text-info' },
                  { label: 'ĐÃ THUỘC', value: stats?.mature ?? 0, color: 'text-success' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-card border border-border/10 p-2 text-center">
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                    <p className="text-[8px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">{label}</p>
                  </div>
                ))}
          </div>

          {/* Filter chips */}
          <div className="flex gap-2">
            {(['all', 'vocab', 'kanji', 'decks'] as CardTypeFilter[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  'px-3 py-1.5 text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest border transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/20 hover:border-border/40 text-muted-foreground',
                ].join(' ')}
              >
                {FILTER_LABELS[f]}
                {f !== 'all' && stats && (
                  <span className="ml-1 opacity-60">
                    {f === 'vocab'
                      ? stats.vocabDue
                      : f === 'kanji'
                        ? stats.kanjiDue
                        : 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Main CTA */}
        {filter !== 'decks' && (
          <Button
            size="lg"
            className="w-full h-14 text-base font-[var(--br-heading-font)] uppercase tracking-wide"
            onClick={startReview}
            disabled={dueCount === 0}
          >
            {dueCount > 0 ? `▶ ÔN TẬP HÔM NAY (${dueCount})` : '✓ ĐÃ ÔN TẬP XONG'}
          </Button>
        )}

        {/* Active deck sections */}
        {filter === 'decks' && (
          <div className="flex flex-col gap-4">
            <ActiveDeckVocabSection userId={userId} />
            <ActiveDeckKanjiSection userId={userId} />
          </div>
        )}

        {/* Time groups */}
        {stats && filter !== 'decks' && (
          <div className="flex flex-col gap-2">
            <p className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
              SẮP ĐẾN HẠN
            </p>
            {[
              ...(stats.dueLaterToday > 0
                ? [{
                    label: 'Hôm nay',
                    count: stats.dueLaterToday,
                    color: 'text-warning',
                    countdownMs: stats.nextDueLaterTodayMs,
                  }]
                : []),
              {
                label: 'Ngày mai',
                count: stats.dueTomorrow,
                color: 'text-info',
                countdownMs: stats.nextDueTomorrowMs,
              },
              {
                label: 'Tuần này',
                count: stats.dueThisWeek,
                color: 'text-foreground/50',
                countdownMs: stats.nextDueThisWeekMs,
              },
              ...(stats.due21Days > 0
                ? [{
                    label: '21 ngày tới',
                    count: stats.due21Days,
                    color: 'text-foreground/30',
                    countdownMs: stats.nextDue21DaysMs,
                  }]
                : []),
            ].map(({ label, count, color, countdownMs }) => {
              const countdown = formatCountdown(nowMs, countdownMs)
              return (
                <div key={label} className="flex items-center justify-between px-3 py-2 border border-border/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground">{label}</span>
                    {countdown && (
                      <span className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground/50">
                        {`còn ${countdown}`}
                      </span>
                    )}
                  </div>
                  <span className={`font-bold text-lg ${color}`}>{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Link to books for free study */}
        <div className="border-t border-border/10 pt-4">
          <Link
            to="/books"
            className="flex items-center justify-between px-3 py-3 border border-border/10 hover:border-border/30 transition-colors"
          >
            <span className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-widest">
              TỰ HỌC THEO BÀI
            </span>
            <span className="text-muted-foreground">→</span>
          </Link>
        </div>
      </div>

      <SrsGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  )
}
