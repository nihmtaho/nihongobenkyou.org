import type { SRSRating } from '../../types/srs'
import type { SessionStats, StudyMode } from '../../types/study'
import type { ActiveTab } from './study.config'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useStudySessionStore } from '../../stores/studySessionStore'
import { SessionStatsBar } from '../analytics/SessionStatsBar'

interface SessionSummaryProps {
  stats: SessionStats
  mode: StudyMode
  ratingCounts?: Record<SRSRating, number>
  streak?: number
  lessonContext?: { book: string, lesson: number }
  returnTab?: ActiveTab
  userId?: string
}

const MODE_LABELS: Record<StudyMode, string> = {
  'flashcard': 'Thẻ từ',
  'quiz': 'Trắc nghiệm',
  'type-input': 'Gõ từ',
  'sentence-flashcard': 'Thẻ câu',
  'listening': 'Nghe hiểu',
  'reading-comprehension': 'Đọc hiểu',
  'pitch-discrimination': 'Thanh điệu',
}

function formatDuration(startTime: Date): string {
  const secs = Math.round((Date.now() - startTime.getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionSummary({ stats, mode, ratingCounts, streak, lessonContext, returnTab, userId }: SessionSummaryProps) {
  const requeueWrongCards = useStudySessionStore(s => s.requeueWrongCards)
  const navigate = useNavigate()
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  const isPerfect = stats.total > 0 && stats.correct === stats.total
  const hasWrong = !isPerfect && stats.wrongCards.length > 0

  function handleRetryWrong() {
    requeueWrongCards()
    navigate({ to: '/study/$mode', params: { mode }, search: { returnTab } })
  }

  function navigateToStudy() {
    navigate({ to: '/study', search: { tab: returnTab } })
  }

  function handleBackToLesson() {
    if (lessonContext) {
      navigate({
        to: '/books/$book/$lesson',
        params: { book: lessonContext.book, lesson: String(lessonContext.lesson) },
      })
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto lg:max-w-lg">

      {/* Header */}
      <div className="w-full flex items-start justify-between">
        <div>
          <p className="text-[11px] font-[var(--br-mono-font)] uppercase text-muted-foreground mb-1">
            {MODE_LABELS[mode]}
            {' '}
            · KẾT QUẢ
          </p>
          <p className={`text-3xl font-black font-[var(--br-heading-font)] uppercase tracking-tight ${isPerfect ? 'text-success' : ''}`}>
            {isPerfect ? 'HOÀN HẢO!' : 'HOÀN THÀNH'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black font-[var(--br-mono-font)] ${accuracy >= 80 ? 'text-success' : accuracy >= 50 ? 'text-warning' : 'text-destructive'}`}>
            {accuracy}
            <span className="text-xl">%</span>
          </p>
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground">CHÍNH XÁC</p>
        </div>
      </div>

      {/* Live stats bar */}
      {userId && <SessionStatsBar userId={userId} />}

      {/* Stats row */}
      <div className="grid grid-cols-3 w-full border border-border/10 divide-x divide-border/10">
        <div className="p-3">
          <div className="text-base font-[var(--br-mono-font)]">
            {stats.correct}
            <span className="text-foreground/40">
              /
              {stats.total}
            </span>
          </div>
          <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">ĐÚNG</div>
        </div>
        {hasWrong && (
          <div className="p-3">
            <div className="text-base font-[var(--br-mono-font)] text-destructive">{stats.wrongCards.length}</div>
            <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">SAI</div>
          </div>
        )}
        <div className="p-3">
          <div className="text-base font-[var(--br-mono-font)]">{formatDuration(stats.startTime)}</div>
          <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">THỜI GIAN</div>
        </div>
        {streak !== undefined && (
          <div className="p-3">
            <div className="text-base font-[var(--br-mono-font)] text-primary">{streak}</div>
            <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">NGÀY</div>
          </div>
        )}
      </div>

      {/* Rating breakdown */}
      {ratingCounts && (
        <div className="grid grid-cols-4 w-full border border-border/10 divide-x divide-border/10">
          <div className="p-3">
            <div className="text-base font-[var(--br-mono-font)] text-destructive">{ratingCounts[0]}</div>
            <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">AGAIN</div>
          </div>
          <div className="p-3">
            <div className="text-base font-[var(--br-mono-font)] text-warning">{ratingCounts[1]}</div>
            <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">HARD</div>
          </div>
          <div className="p-3">
            <div className="text-base font-[var(--br-mono-font)] text-success">{ratingCounts[2]}</div>
            <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">GOOD</div>
          </div>
          <div className="p-3">
            <div className="text-base font-[var(--br-mono-font)] text-info">{ratingCounts[3]}</div>
            <div className="text-[9px] font-[var(--br-mono-font)] uppercase text-muted-foreground">EASY</div>
          </div>
        </div>
      )}

      {/* Wrong cards preview */}
      {hasWrong && (
        <div className="w-full border-l-4 border-destructive bg-destructive/5 p-3 flex flex-col gap-2">
          <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-destructive tracking-widest">
            {stats.wrongCards.length}
            {' '}
            TỪ CẦN ÔN LẠI
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.wrongCards.slice(0, 8).map(c => (
              <span
                key={c.vocab_id}
                className="text-sm font-[var(--br-jp-font)] bg-card border border-border/10 px-2 py-0.5"
              >
                {c.word ?? c.reading}
              </span>
            ))}
            {stats.wrongCards.length > 8 && (
              <span className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground self-center">
                +
                {stats.wrongCards.length - 8}
                {' '}
                nữa
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        {hasWrong && (
          <Button
            variant="destructive"
            className="w-full font-[var(--br-heading-font)] uppercase tracking-wide"
            onClick={handleRetryWrong}
          >
            ÔN LẠI
            {' '}
            {stats.wrongCards.length}
            {' '}
            TỪ SAI
          </Button>
        )}

        {lessonContext
          ? (
              <>
                <Button
                  className="w-full font-[var(--br-heading-font)] uppercase tracking-wide"
                  onClick={handleBackToLesson}
                >
                  ← VỀ BÀI
                  {' '}
                  {String(lessonContext.lesson).padStart(2, '0')}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full font-[var(--br-mono-font)] uppercase text-[11px]"
                  onClick={() => navigateToStudy()}
                >
                  Về Study
                </Button>
              </>
            )
          : (
              <Button
                className="w-full font-[var(--br-heading-font)] uppercase tracking-wide"
                onClick={() => navigateToStudy()}
              >
                VỀ STUDY
              </Button>
            )}
      </div>
    </div>
  )
}
