import type { ContentRepository } from '../content/repository.ts'
import type { DailyChallenge } from '../content/schemas.ts'
import { GAME_CONFIG } from '../domain/config.ts'
import { dailyTotals, DAILY_MAX_SCORE } from '../domain/daily.ts'
import { isFinal, type RoundState } from '../domain/round.ts'
import type { I18n } from '../i18n/I18nContext.ts'
import type { DailyProgress } from '../storage/schemas.ts'
import { createRoundFor, newId, resultFromRound } from './practiceSession.ts'

/** Start a challenge from a schedule entry, freezing its puzzle references. */
export function startDaily(
  entry: DailyChallenge,
  repo: ContentRepository,
  now: string,
): DailyProgress | null {
  const session = { sessionId: newId() }
  const round = createRoundFor(session, repo, entry.puzzleRefs[0], now, 'daily')
  if (!round) return null
  return {
    schemaVersion: GAME_CONFIG.storage.schemaVersion,
    dailyId: entry.id,
    dateUtc: entry.dateUtc,
    sessionId: session.sessionId,
    contentVersion: entry.contentVersion,
    scoringVersion: entry.scoringVersion,
    contentSource: repo.kind,
    puzzleRefs: entry.puzzleRefs.map(({ id, revision }) => ({ id, revision })),
    currentRoundIndex: 0,
    results: [],
    activeRound: round,
    startedAt: now,
    completedAt: null,
  }
}

export function isDailyComplete(progress: DailyProgress): boolean {
  return progress.completedAt !== null
}

/** Store the new round state; record its result exactly once, however often this is called. */
export function applyDailyRoundUpdate(
  progress: DailyProgress,
  next: RoundState,
  clubId: string,
): DailyProgress {
  if (isDailyComplete(progress)) return progress
  const recorded = progress.results.some((r) => r.roundId === next.roundId)
  const results =
    isFinal(next.status) && !recorded ? [...progress.results, resultFromRound(next, clubId)] : progress.results
  return { ...progress, activeRound: next, results }
}

/** Move on after a finished round: next puzzle, or the daily summary after the last one. */
export function advanceDaily(progress: DailyProgress, repo: ContentRepository, now: string): DailyProgress {
  if (isDailyComplete(progress) || !progress.activeRound || !isFinal(progress.activeRound.status)) return progress
  const index = progress.currentRoundIndex + 1
  if (index >= progress.puzzleRefs.length) {
    return { ...progress, currentRoundIndex: index, activeRound: null, completedAt: now }
  }
  return {
    ...progress,
    currentRoundIndex: index,
    activeRound: createRoundFor(progress, repo, progress.puzzleRefs[index], now, 'daily'),
  }
}

/**
 * A stored challenge resumes only if its content source and every frozen puzzle revision
 * still exist with the same scoring version. Otherwise it is a restore problem; it is never
 * quietly mapped to a different puzzle and the record is left untouched.
 */
export function canRestoreDaily(progress: DailyProgress, repo: ContentRepository): boolean {
  if (progress.contentSource !== repo.kind) return false
  const puzzlesOk = progress.puzzleRefs.every((ref) => {
    const playable = repo.getPlayablePuzzle(ref)
    return playable !== null && playable.scoringVersion === progress.scoringVersion
  })
  if (!puzzlesOk) return false
  if (isDailyComplete(progress)) return progress.results.length === progress.puzzleRefs.length
  const round = progress.activeRound
  const ref = progress.puzzleRefs[progress.currentRoundIndex]
  return (
    round !== null &&
    ref !== undefined &&
    round.mode === 'daily' &&
    round.puzzleId === ref.id &&
    round.puzzleRevision === ref.revision
  )
}

export function dailyProgressTotals(progress: DailyProgress) {
  return dailyTotals(progress.results)
}

/**
 * Spoiler-free text for sharing: counts and clue ratios only. It never contains club names,
 * puzzle ids or anything that describes a crest.
 */
export function shareText(progress: DailyProgress, t: I18n['t']): string {
  const { score, solved } = dailyTotals(progress.results)
  const lines = [
    `Badge DNA · ${progress.dateUtc}`,
    t('daily.share.solved', { solved, total: progress.puzzleRefs.length }),
    t('daily.share.score', { score, max: DAILY_MAX_SCORE }),
  ]
  const clues = progress.results
    .filter((r) => r.status === 'solved')
    .map((r) => `${r.revealedCount}/${r.totalReveals}`)
  if (clues.length > 0) lines.push(t('daily.share.reveals', { list: clues.join(', ') }))
  return lines.join('\n')
}
