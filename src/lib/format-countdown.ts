/**
 * Format a countdown from `nowMs` to `targetMs`.
 * Returns a short Vietnamese-style string:
 *   "< 1 phút"    (< 60 seconds)
 *   "5 phút"      (< 60 minutes)
 *   "1g 30p"      (< 24 hours)
 *   "3 ngày"      (>= 1 day)
 * Returns null if targetMs is null or already past (targetMs <= nowMs).
 */
export function formatCountdown(nowMs: number, targetMs: number | null): string | null {
  if (targetMs == null || targetMs <= nowMs)
    return null
  const diffMs = targetMs - nowMs
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60)
    return '< 1 phút'
  if (diffMin < 60)
    return `${diffMin} phút`
  if (diffHours < 24) {
    const remMin = diffMin % 60
    return remMin > 0 ? `${diffHours}g ${remMin}p` : `${diffHours}g`
  }
  return `${diffDays} ngày`
}
