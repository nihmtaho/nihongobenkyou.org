import type { ActiveTab } from '../../../components/study/study.config'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { SrsGuideDialog } from '../../../components/study/SrsGuideDialog'
import { TABS } from '../../../components/study/study.config'
import { DeckStudyTab } from '../../../components/study/tabs/DeckStudyTab'
import { KanjiStudyTab } from '../../../components/study/tabs/KanjiStudyTab'
import { VocabStudyTab } from '../../../components/study/tabs/VocabStudyTab'
import { useStreak } from '../../../hooks/useStreak'
import { useUnifiedDueStats } from '../../../hooks/useUnifiedDueStats'
import { useAuthStore } from '../../../stores/authStore'

export const Route = createFileRoute('/_authenticated/study/')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: TABS.some(t => t.id === search.tab)
      ? (search.tab as ActiveTab)
      : ('vocab' as ActiveTab),
  }),
  component: StudyDashboardPage,
})

const TAB_CONFIG: Array<{
  key: ActiveTab
  label: string
  dueKey: 'vocabDue' | 'kanjiDue' | 'customDecksDueToday'
  badgeClass: string
}> = [
  { key: 'vocab', label: TABS[0].jp, dueKey: 'vocabDue', badgeClass: 'bg-destructive text-destructive-foreground' },
  { key: 'kanji', label: TABS[1].jp, dueKey: 'kanjiDue', badgeClass: 'bg-info text-foreground' },
  { key: 'decks', label: TABS[2].jp, dueKey: 'customDecksDueToday', badgeClass: 'bg-primary text-primary-foreground' },
]

function StudyDashboardPage() {
  const userId = useAuthStore(s => s.userId) ?? ''
  const navigate = Route.useNavigate()
  const { tab } = Route.useSearch()
  const [guideOpen, setGuideOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: stats, isLoading } = useUnifiedDueStats(userId)
  const { data: streak } = useStreak(userId)

  // Auto-invalidate when the soonest upcoming card becomes overdue.
  useEffect(() => {
    const soonest = stats?.nextDueLaterTodayMs ?? null
    if (!soonest)
      return
    const delay = soonest - Date.now()
    if (delay <= 0) {
      queryClient.invalidateQueries({ queryKey: ['unified-due-stats', userId] })
      queryClient.invalidateQueries({ queryKey: ['custom-deck-progress', userId] })
      queryClient.invalidateQueries({ queryKey: ['all-custom-deck-srs-summary', userId] })
      return
    }
    const id = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['unified-due-stats', userId] })
      queryClient.invalidateQueries({ queryKey: ['custom-deck-progress', userId] })
      queryClient.invalidateQueries({ queryKey: ['all-custom-deck-srs-summary', userId] })
    }, delay)
    return () => clearTimeout(id)
  }, [stats?.nextDueLaterTodayMs, queryClient, userId])

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/10">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
              STUDY
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground px-2"
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

          {/* Tab navigation */}
          <div className="flex border-b border-border/10">
            {TAB_CONFIG.map(({ key, label, dueKey, badgeClass }) => {
              const dueCount = stats?.[dueKey] ?? 0
              const isActive = tab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate({ search: { tab: key } })}
                  className={cn(
                    'px-4 pb-2.5 pt-1 text-[11px] font-[var(--br-mono-font)] uppercase tracking-widest',
                    'flex items-center gap-1.5 border-b-2 -mb-px transition-colors',
                    isActive
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="font-[var(--br-jp-font)]">{label}</span>
                  {dueCount > 0 && (
                    <span className={cn('text-[9px] px-1 py-0.5 font-bold leading-none', badgeClass)}>
                      {dueCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto w-full px-4 py-4">
        {isLoading || !stats
          ? <Skeleton className="h-48 w-full" />
          : (
              <>
                {tab === 'vocab' && <VocabStudyTab userId={userId} stats={stats} />}
                {tab === 'kanji' && <KanjiStudyTab userId={userId} stats={stats} />}
                {tab === 'decks' && <DeckStudyTab userId={userId} stats={stats} />}
              </>
            )}
      </div>

      <SrsGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  )
}
