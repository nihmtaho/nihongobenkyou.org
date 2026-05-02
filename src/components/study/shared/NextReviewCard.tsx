function getDateStrings() {
  const now = Date.now()
  return {
    today: new Date(now).toISOString().slice(0, 10),
    tomorrow: new Date(now + 86400000).toISOString().slice(0, 10),
  }
}

export function NextReviewCard({ nextDueDate }: { nextDueDate: string | null }) {
  const { today, tomorrow } = getDateStrings()

  let display = '---'
  let hint = 'Chưa có lượt ôn tiếp theo'

  if (nextDueDate) {
    if (nextDueDate <= today) {
      display = 'HÔM NAY'
      hint = 'Có thẻ đang đến hạn'
    }
    else if (nextDueDate === tomorrow) {
      display = 'NGÀY MAI'
      hint = 'Lượt ôn tiếp theo vào ngày mai'
    }
    else {
      const [, month, day] = nextDueDate.split('-')
      display = `${day}/${month}`
      hint = `Lượt ôn tiếp theo: ${nextDueDate}`
    }
  }

  return (
    <div className="border-t-4 border-info bg-info/5 p-4 lg:p-5">
      <p className="text-[10px] font-[var(--br-mono-font)] uppercase text-neutral tracking-wider mb-2">
        LƯỢT ÔN TIẾP THEO
      </p>
      <p className="text-3xl font-black font-[var(--br-mono-font)] leading-none mb-2 tracking-tight">
        {display}
      </p>
      <p className="text-[11px] font-[var(--br-mono-font)] text-neutral">{hint}</p>
    </div>
  )
}
