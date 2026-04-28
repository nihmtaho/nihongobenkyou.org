export function formatNextReview(dueDates: string[], today: string): string | null {
  const next = dueDates.filter(d => d > today).sort()[0]
  if (!next)
    return null

  const diffDays = Math.round(
    (new Date(next).getTime() - new Date(today).getTime()) / 86_400_000,
  )

  if (diffDays <= 0)
    return null
  if (diffDays === 1)
    return 'ngày mai'
  if (diffDays < 7)
    return `${diffDays} ngày`
  if (diffDays < 14)
    return '1 tuần'
  if (diffDays < 21)
    return '2 tuần'
  if (diffDays < 28)
    return '3 tuần'
  if (diffDays < 60)
    return '1 tháng'
  return `${Math.floor(diffDays / 30)} tháng`
}
