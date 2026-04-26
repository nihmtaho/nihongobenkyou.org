import type { SRSRating } from '../../types/srs'
import type { SessionStats, StudyMode } from '../../types/study'
import { useNavigate } from '@tanstack/react-router'
import { useStudySessionStore } from '../../stores/studySessionStore'

interface SessionSummaryProps {
  stats: SessionStats
  mode: StudyMode
  ratingCounts?: Record<SRSRating, number>
  streak?: number
}

function formatDuration(startTime: Date): string {
  const secs = Math.round((Date.now() - startTime.getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionSummary({ stats, mode, ratingCounts, streak }: SessionSummaryProps) {
  const requeueWrongCards = useStudySessionStore(s => s.requeueWrongCards)
  const navigate = useNavigate()
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  const isPerfect = stats.total > 0 && stats.correct === stats.total

  function handleRetryWrong() {
    requeueWrongCards()
    navigate({ to: '/study/$mode', params: { mode } })
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
      {isPerfect
        ? (
            <p className="text-2xl font-black font-[var(--br-heading-font)] uppercase tracking-tight text-success">
              HOÀN HẢO!
            </p>
          )
        : (
            <p className="text-2xl font-black font-[var(--br-heading-font)] uppercase tracking-tight">
              HOÀN THÀNH
            </p>
          )}

      <div className="stats stats-vertical w-full border border-base-content/10">
        <div className="stat">
          <div className="stat-title font-[var(--br-mono-font)] text-[10px] uppercase">Score</div>
          <div className="stat-value font-[var(--br-mono-font)]">
            {stats.correct}
            /
            {stats.total}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title font-[var(--br-mono-font)] text-[10px] uppercase">Accuracy</div>
          <div className="stat-value text-primary font-[var(--br-mono-font)]">
            {accuracy}
            %
          </div>
        </div>
        <div className="stat">
          <div className="stat-title font-[var(--br-mono-font)] text-[10px] uppercase">Time</div>
          <div className="stat-value text-sm font-[var(--br-mono-font)]">{formatDuration(stats.startTime)}</div>
        </div>
      </div>

      {ratingCounts && (
        <div className="stats stats-horizontal w-full border border-base-content/10">
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-error">{ratingCounts[0]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">AGAIN</div>
          </div>
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-warning">{ratingCounts[1]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">HARD</div>
          </div>
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-success">{ratingCounts[2]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">GOOD</div>
          </div>
          <div className="stat p-3">
            <div className="stat-value text-base font-[var(--br-mono-font)] text-info">{ratingCounts[3]}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[9px] uppercase">EASY</div>
          </div>
        </div>
      )}

      {streak !== undefined && (
        <div className="stats w-full border border-base-content/10">
          <div className="stat">
            <div className="stat-value font-[var(--br-mono-font)] text-2xl">{streak}</div>
            <div className="stat-desc font-[var(--br-mono-font)] text-[10px] uppercase">DAY STREAK</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        {!isPerfect && stats.wrongCards.length > 0 && (
          <button className="btn btn-primary w-full font-[var(--br-heading-font)] uppercase" onClick={handleRetryWrong}>
            Retry Wrong (
            {stats.wrongCards.length}
            )
          </button>
        )}
        <button
          className="btn btn-ghost w-full font-[var(--br-mono-font)] uppercase text-[11px]"
          onClick={() => navigate({ to: '/' })}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}
