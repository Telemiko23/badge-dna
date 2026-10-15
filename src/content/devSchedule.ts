import { addDays, dayStartMs } from '../domain/dates.ts'
import { mulberry32 } from '../domain/practice.ts'
import type { RawContent } from './schemas.ts'

interface SchedulablePuzzle {
  id: string
  revision: number
  clubId: string
}

/**
 * Development-only daily schedule for puzzle pools that have no hand-made schedule (draft candidates).
 * Explicit dated entries around "today": each day gets three puzzles of three different clubs, chosen
 * deterministically from the date. Real schedules are hand-made files in content/daily.
 */
export function devDailySchedule(
  puzzles: readonly SchedulablePuzzle[],
  todayUtc: string,
  contentVersion: string,
  daysBefore = 3,
  daysAfter = 14,
): RawContent['daily'] {
  const byClub = new Map<string, SchedulablePuzzle[]>()
  for (const p of puzzles) byClub.set(p.clubId, [...(byClub.get(p.clubId) ?? []), p])
  const clubIds = [...byClub.keys()].sort()
  if (clubIds.length < 3) return []

  const entries: RawContent['daily'] = []
  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    const dateUtc = addDays(todayUtc, offset)
    const rand = mulberry32(Math.floor(dayStartMs(dateUtc) / 86_400_000))
    const shuffled = [...clubIds]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const refs = shuffled.slice(0, 3).map((clubId) => {
      const options = [...byClub.get(clubId)!].sort((a, b) => a.id.localeCompare(b.id))
      const pick = options[Math.floor(rand() * options.length)]
      return { id: pick.id, revision: pick.revision }
    })
    entries.push({ id: `dev-d-${dateUtc}`, dateUtc, puzzleRefs: refs, contentVersion, scoringVersion: 'scoring-v1' })
  }
  return entries
}
