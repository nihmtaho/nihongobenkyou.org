import { Link } from '@tanstack/react-router'

interface Props {
  totalCardCount: number | undefined
  futureCards: { due_date: string }[] | undefined
}

function nextDueLabel(cards: { due_date: string }[]): string {
  if (cards.length === 0)
    return ''
  const next = cards.reduce((min, c) => (c.due_date < min ? c.due_date : min), cards[0].due_date)
  const diff = Math.max(0, Math.ceil((new Date(next).getTime() - Date.now()) / 60000))
  if (diff === 0)
    return 'ngay bây giờ'
  if (diff < 60)
    return `${diff} phút nữa`
  const hours = Math.floor(diff / 60)
  return `${hours} giờ nữa`
}

export function SrsEmptyState({ totalCardCount, futureCards }: Props) {
  if (totalCardCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase">
          CHƯA CÓ THẺ
        </h1>
        <p className="text-base-content/60 font-[var(--br-mono-font)] text-sm uppercase text-center">
          Hãy thêm từ vựng để bắt đầu luyện tập
        </p>
        <Link to="/books" className="btn btn-primary btn-sm font-[var(--br-heading-font)] uppercase">
          Duyệt sách
        </Link>
      </div>
    )
  }

  const nextLabel = futureCards && futureCards.length > 0
    ? nextDueLabel(futureCards)
    : ''

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <h1 className="text-4xl font-black font-[var(--br-heading-font)] tracking-tight uppercase text-success">
        TẤT CẢ ĐÃ XONG!
      </h1>
      <p className="text-base-content/60 font-[var(--br-mono-font)] text-sm uppercase text-center">
        Không có thẻ nào đến hạn hôm nay
        {nextLabel ? ` — thẻ tiếp theo ${nextLabel}` : ''}
      </p>
      <Link to="/books" className="btn btn-outline btn-sm font-[var(--br-mono-font)] uppercase">
        Xem sách
      </Link>
    </div>
  )
}
