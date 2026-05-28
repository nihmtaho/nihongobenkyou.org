/**
 * Returns today's date as 'YYYY-MM-DD' in the user's local timezone.
 * Note: toISOString() returns UTC — do NOT use it here.
 */
export function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns an array of the last N calendar dates (inclusive of today),
 * oldest first. Example with n=3 and today='2026-05-28':
 *   ['2026-05-26', '2026-05-27', '2026-05-28']
 */
export function getLastNDates(n: number): string[] {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (n - 1 - i))
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })
}
