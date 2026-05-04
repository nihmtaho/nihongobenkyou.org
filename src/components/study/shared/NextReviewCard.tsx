import { useEffect, useState } from 'react'

function parseDueDate(d: string): Date {
  return d.includes('T') ? new Date(d) : new Date(`${d}T00:00:00`)
}

function getRemaining(nextDueDate: string): { display: string, hint: string, isLive: boolean } {
  const target = parseDueDate(nextDueDate)
  const diffMs = target.getTime() - Date.now()

  if (diffMs <= 0) {
    return { display: 'ĐẾN HẠN', hint: 'Có thẻ đang đến hạn', isLive: false }
  }

  const totalSecs = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60

  const pad = (n: number) => String(n).padStart(2, '0')

  if (days === 0) {
    return {
      display: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
      hint: 'Lượt ôn tiếp theo hôm nay',
      isLive: true,
    }
  }

  return {
    display: `${days} NGÀY ${pad(hours)}:${pad(mins)}`,
    hint: `Lượt ôn tiếp theo: ${nextDueDate.split('-').reverse().slice(0, 2).join('/')}`,
    isLive: days < 7,
  }
}

export function NextReviewCard({ nextDueDate }: { nextDueDate: string | null }) {
  const [tick, setTick] = useState(0)

  const derived = nextDueDate ? getRemaining(nextDueDate) : null
  const isLive = derived?.isLive ?? false

  useEffect(() => {
    if (!isLive)
      return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [isLive, nextDueDate])

  // tick referenced so re-render fires each second
  void tick

  const display = derived?.display ?? '---'
  const hint = derived?.hint ?? 'Chưa có lượt ôn tiếp theo'

  return (
    <div className="border-t-4 border-info bg-info/5 p-4 lg:p-5">
      <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-muted-foreground tracking-wider mb-2">
        LƯỢT ÔN TIẾP THEO
      </p>
      <p className="text-3xl font-black font-[var(--br-mono-font)] leading-none mb-2 tracking-tight tabular-nums">
        {display}
      </p>
      <p className="text-[11px] font-[var(--br-mono-font)] text-muted-foreground">{hint}</p>
    </div>
  )
}
