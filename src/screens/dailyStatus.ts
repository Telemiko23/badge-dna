import type { ContentRepository } from '../content/repository.ts'
import { gameDateUtc } from '../domain/dates.ts'
import { getStorage } from '../storage/safeStorage.ts'
import { listDailyDates, loadDaily } from '../storage/stores.ts'
import { canRestoreDaily, isDailyComplete } from './dailySession.ts'

export type DailyCardState =
  | { kind: 'storage-unavailable' }
  | { kind: 'unavailable' }
  | { kind: 'not-started'; date: string }
  | { kind: 'in-progress'; date: string; index: number; total: number }
  | { kind: 'completed'; date: string; score: number }
  | { kind: 'problem'; date: string }

export interface DailyStatus {
  today: DailyCardState
  /** An earlier challenge that was started but not finished; it may still be completed. */
  older: { date: string; index: number; total: number } | null
}

function describeStored(date: string, repo: ContentRepository): DailyCardState | null {
  const stored = loadDaily(date)
  if (stored.kind === 'none' || stored.kind === 'unavailable') return null
  if (stored.kind === 'corrupt' || !canRestoreDaily(stored.value, repo)) return { kind: 'problem', date }
  const p = stored.value
  if (isDailyComplete(p)) {
    return { kind: 'completed', date, score: p.results.reduce((sum, r) => sum + r.score, 0) }
  }
  return { kind: 'in-progress', date, index: p.currentRoundIndex + 1, total: p.puzzleRefs.length }
}

export function getDailyStatus(repo: ContentRepository, nowMs: number): DailyStatus {
  if (getStorage() === null) return { today: { kind: 'storage-unavailable' }, older: null }
  const today = gameDateUtc(nowMs)

  const stored = describeStored(today, repo)
  const todayCard: DailyCardState =
    stored ?? (repo.getValidDaily(today) ? { kind: 'not-started', date: today } : { kind: 'unavailable' })

  const olderDates = listDailyDates().filter((d) => d < today).reverse()
  for (const date of olderDates) {
    const card = describeStored(date, repo)
    if (card?.kind === 'in-progress') return { today: todayCard, older: { date, index: card.index, total: card.total } }
  }
  return { today: todayCard, older: null }
}
