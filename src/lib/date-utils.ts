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
 * Returns today's date as 'YYYY-MM-DD' in UTC.
 * Use this when comparing against ISO-8601 timestamps stored via new Date().toISOString().
 */
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10)
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

export interface WeekBounds {
  weekStart: string // 'YYYY-MM-DD' — Monday of current ISO week (UTC+7)
  weekEnd: string // 'YYYY-MM-DD' — Sunday of current ISO week (UTC+7)
  daysUntilReset: number // 1–7, days until next Monday (inclusive of today's count)
}

/**
 * Returns the ISO week boundaries (Mon–Sun) in UTC+7.
 * Used by LeaderboardHeader to display the week label and countdown.
 */
export function getWeekBounds(): WeekBounds {
  // Get current moment expressed in Vietnam timezone
  const now = new Date()
  const vnDateStr = now.toLocaleString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  // en-CA locale gives 'YYYY-MM-DD, HH:MM:SS' — split on comma to get date part
  const [datePart] = vnDateStr.split(',')
  const [year, month, day] = datePart.trim().split('-').map(Number)
  const vnDate = new Date(year, month - 1, day) // local midnight (for day arithmetic only)

  // JS getDay(): 0=Sun, 1=Mon ... 6=Sat → convert to ISO: 0=Mon, 6=Sun
  const jsDay = vnDate.getDay()
  const daysFromMonday = jsDay === 0 ? 6 : jsDay - 1

  const monday = new Date(vnDate)
  monday.setDate(vnDate.getDate() - daysFromMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const daysUntilReset = 7 - daysFromMonday

  return {
    weekStart: _fmtDate(monday),
    weekEnd: _fmtDate(sunday),
    daysUntilReset,
  }
}

function _fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
