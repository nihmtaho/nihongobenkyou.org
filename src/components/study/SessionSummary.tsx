import type { SessionStats, StudyMode } from '../../types/study'
import { useNavigate } from '@tanstack/react-router'
import { useStudySessionStore } from '../../stores/studySessionStore'

interface SessionSummaryProps {
  stats: SessionStats
  mode: StudyMode
}

function formatDuration(startTime: Date): string {
  const secs = Math.round((Date.now() - startTime.getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionSummary({ stats, mode }: SessionSummaryProps) {
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
        ? <p className="text-2xl font-bold text-success">Perfect session! 🎉</p>
        : <p className="text-2xl font-bold">Session complete</p>}

      <div className="stats stats-vertical shadow w-full">
        <div className="stat">
          <div className="stat-title">Score</div>
          <div className="stat-value">
            {stats.correct}
            /
            {stats.total}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Accuracy</div>
          <div className="stat-value text-primary">
            {accuracy}
            %
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Time</div>
          <div className="stat-value text-sm">{formatDuration(stats.startTime)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {!isPerfect && stats.wrongCards.length > 0 && (
          <button className="btn btn-primary w-full" onClick={handleRetryWrong}>
            Retry Wrong (
            {stats.wrongCards.length}
            )
          </button>
        )}
        <button className="btn btn-ghost w-full" onClick={() => navigate({ to: '/books' })}>
          Back to Books
        </button>
      </div>
    </div>
  )
}
