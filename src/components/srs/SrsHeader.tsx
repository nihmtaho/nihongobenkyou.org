function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  current: number
  total: number
  elapsed: number
  srsMode: 'flashcard' | 'type-input'
}

export function SrsHeader({ current, total, elapsed, srsMode }: Props) {
  const padded = srsMode === 'type-input'

  return (
    <>
      <div className={`flex items-center justify-between ${padded ? 'px-4' : ''}`}>
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/60">
          {current}
          {' '}
          /
          {total}
        </span>
        <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-base-content/60">
          {formatTime(elapsed)}
        </span>
      </div>
      <progress
        className={`progress progress-primary h-0.5 w-full ${padded ? 'px-4' : ''}`}
        value={current}
        max={total}
      />
    </>
  )
}
