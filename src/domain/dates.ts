/**
 * Game dates are UTC (spec §11): the day changes at 00:00 UTC for everyone.
 * Local time is used for display only, never to decide which challenge is live.
 */
const DAY_MS = 86_400_000

export function gameDateUtc(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10)
}

export function isValidDateUtc(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const ms = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date
}

export function dayStartMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

export function addDays(date: string, days: number): string {
  return gameDateUtc(dayStartMs(date) + days * DAY_MS)
}

/** The instant (ms) at which the day containing `nowMs` ends. */
export function nextRolloverMs(nowMs: number): number {
  return dayStartMs(gameDateUtc(nowMs)) + DAY_MS
}

export function timeLeft(nowMs: number): { hours: number; minutes: number } {
  const remaining = Math.max(0, nextRolloverMs(nowMs) - nowMs)
  let hours = Math.floor(remaining / 3_600_000)
  let minutes = Math.ceil((remaining % 3_600_000) / 60_000)
  if (minutes === 60) {
    hours += 1
    minutes = 0
  }
  return { hours, minutes }
}
