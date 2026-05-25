import type { SRSStats } from '../../components/common/SRSProgressBar'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SRSProgressBar } from '../../components/common/SRSProgressBar'
import { KanjiStudyModal } from '../../components/kanji/KanjiStudyModal'
import { useKanjiList } from '../../hooks/useKanjiList'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/kanji/lesson/$lesson')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      throw redirect({ to: '/auth/login' })
  },
  component: KanjiLessonDetailPage,
})

function tileStatusColor(intervalDays: number): string {
  if (intervalDays >= 21)
    return 'bg-success'
  if (intervalDays >= 8)
    return 'bg-info'
  return 'bg-warning'
}

function KanjiLessonDetailPage() {
  const { lesson } = Route.useParams()
  const lessonNum = Number(lesson)
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.userId) ?? ''
  const [showStudyModal, setShowStudyModal] = useState(false)

  const { data: kanjiList, isLoading } = useKanjiList(userId, { lesson_number: lessonNum })

  const total = kanjiList?.length ?? 0
  const studied = kanjiList?.filter(k => k.card !== undefined).length ?? 0
  const learning = kanjiList?.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) < 8).length ?? 0
  const review = kanjiList?.filter(k => k.card !== undefined && (k.card.scheduled_days ?? 0) >= 8 && (k.card.scheduled_days ?? 0) < 21).length ?? 0
  const mature = kanjiList?.filter(k => (k.card?.scheduled_days ?? 0) >= 21).length ?? 0

  const srsStats: SRSStats = {
    total,
    new: Math.max(0, total - studied),
    learning,
    review,
    mature,
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b border-border/10 px-4 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Quay lại"
            onClick={() => navigate({ to: '/kanji' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-[var(--br-heading-font)] text-4xl font-black leading-none uppercase">
            BÀI
            {' '}
            {String(lessonNum).padStart(2, '0')}
          </h1>
          <span className="text-[10px] font-[var(--br-mono-font)] text-muted-foreground uppercase ml-auto">
            {total}
            {' '}
            hán tự
          </span>
        </div>

        {!isLoading && (
          <>
            <SRSProgressBar stats={srsStats} height="h-2" animDelay={0.1} />
            <div className="grid grid-cols-4 border border-border/10 bg-card">
              {[
                { value: Math.max(0, total - studied), label: 'CHƯA', color: 'text-foreground/50' },
                { value: learning, label: 'ĐANG HỌC', color: 'text-warning' },
                { value: review, label: 'ÔN TẬP', color: 'text-info' },
                { value: mature, label: 'THUỘC', color: 'text-success' },
              ].map((stat, i, arr) => (
                <div key={stat.label} className={`p-3 text-center ${i < arr.length - 1 ? 'border-r border-border/10' : ''}`}>
                  <div className={`text-xl font-[var(--br-mono-font)] font-bold leading-none ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground uppercase mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full font-[var(--br-mono-font)] uppercase text-[11px]"
              onClick={() => setShowStudyModal(true)}
            >
              Học bài này
            </Button>
          </>
        )}
      </div>

      <div className="px-4 py-4">
        {isLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {!isLoading && (!kanjiList || kanjiList.length === 0) && (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
            <p className="font-[var(--br-mono-font)] text-sm uppercase text-muted-foreground">Không có hán tự</p>
          </div>
        )}

        {!isLoading && kanjiList && kanjiList.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {kanjiList.map(item => (
              <div
                key={item.char}
                role="button"
                tabIndex={0}
                className="flex flex-col items-center gap-1 bg-card border border-border/10 p-3 cursor-pointer hover:border-l-4 hover:border-l-primary transition-all"
                onClick={() => navigate({ to: '/kanji/$char', params: { char: item.char } })}
                onKeyDown={e => e.key === 'Enter' && navigate({ to: '/kanji/$char', params: { char: item.char } })}
              >
                <span className="text-3xl font-bold leading-none font-[var(--br-jp-font)]">
                  {item.char}
                </span>
                <span className="text-[9px] font-[var(--br-mono-font)] text-muted-foreground truncate w-full text-center">
                  {item.han_viet ?? '—'}
                </span>
                {item.card !== undefined && (
                  <span className={`w-1.5 h-1.5 ${tileStatusColor(item.card.scheduled_days ?? 0)}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showStudyModal && (
        <KanjiStudyModal
          lessonNum={lessonNum}
          stats={{ total, new: Math.max(0, total - studied), learning, review, mature }}
          onClose={() => setShowStudyModal(false)}
        />
      )}
    </div>
  )
}
