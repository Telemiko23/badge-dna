import type { ContentRepository } from '../content/repository.ts'
import { buildPracticeOrder, type PuzzleRef } from '../domain/practice.ts'
import { GAME_CONFIG } from '../domain/config.ts'
import { createRound, isFinal, mistakeCount, type RoundState } from '../domain/round.ts'
import type { PracticeProgress, RoundResult } from '../storage/schemas.ts'

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function randomSeed(): number {
  const buf = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buf)
  return buf[0] | 0
}

function candidates(repo: ContentRepository) {
  return repo.publishedPuzzles().map((p) => ({ id: p.id, revision: p.revision, clubId: p.clubId }))
}

export function createRoundFor(
  session: Pick<PracticeProgress, 'sessionId'>,
  repo: ContentRepository,
  ref: PuzzleRef,
  now: string,
): RoundState | null {
  const playable = repo.getPlayablePuzzle(ref)
  if (!playable) return null
  return createRound({
    sessionId: session.sessionId,
    roundId: newId(),
    mode: 'practice',
    puzzleId: playable.ref.id,
    puzzleRevision: playable.ref.revision,
    contentVersion: playable.contentVersion,
    scoringVersion: playable.scoringVersion,
    totalReveals: playable.totalReveals,
    now,
  })
}

/** A fresh session, or null when the pool is empty. */
export function newSession(repo: ContentRepository, now: string, seed = randomSeed()): PracticeProgress | null {
  const order = buildPracticeOrder(candidates(repo), seed)
  if (order.length === 0) return null
  const session: PracticeProgress = {
    schemaVersion: GAME_CONFIG.storage.schemaVersion,
    sessionId: newId(),
    seed,
    contentSource: repo.kind,
    order,
    position: 0,
    results: [],
    activeRound: null,
  }
  return { ...session, activeRound: createRoundFor(session, repo, order[0], now) }
}

export function resultFromRound(round: RoundState, clubId: string): RoundResult {
  return {
    roundId: round.roundId,
    puzzleId: round.puzzleId,
    puzzleRevision: round.puzzleRevision,
    clubId,
    status: round.status as RoundResult['status'],
    score: round.finalScore ?? 0,
    revealedCount: Math.max(1, round.revealedCount),
    totalReveals: round.totalReveals,
    mistakes: mistakeCount(round),
    finishedAt: round.finishedAt ?? new Date().toISOString(),
  }
}

/** Store the new round state; record the result exactly once when the round finishes. */
export function applyRoundUpdate(session: PracticeProgress, next: RoundState, clubId: string): PracticeProgress {
  const alreadyRecorded = session.results.some((r) => r.roundId === next.roundId)
  const results =
    isFinal(next.status) && !alreadyRecorded ? [...session.results, resultFromRound(next, clubId)] : session.results
  return { ...session, activeRound: next, results }
}

export function isExhausted(session: PracticeProgress): boolean {
  return session.position >= session.order.length
}

export function advance(session: PracticeProgress, repo: ContentRepository, now: string): PracticeProgress {
  const position = session.position + 1
  const ref = session.order[position]
  return {
    ...session,
    position,
    activeRound: ref ? createRoundFor(session, repo, ref, now) : null,
  }
}

/** After exhausting the pool: new shuffled cycle; the first puzzle avoids the last club played. */
export function startNewCycle(session: PracticeProgress, repo: ContentRepository, now: string): PracticeProgress | null {
  const lastClubId = session.results.at(-1)?.clubId ?? null
  const seed = randomSeed()
  const order = buildPracticeOrder(candidates(repo), seed, lastClubId)
  if (order.length === 0) return null
  const next = { ...session, seed, order, position: 0 }
  return { ...next, activeRound: createRoundFor(next, repo, order[0], now) }
}

/**
 * A stored session can be resumed only if it came from the same content source and
 * its active round still points at the same puzzle revision and scoring version.
 * Anything else is a restore problem; it is never silently mapped to another puzzle.
 */
export function canRestore(session: PracticeProgress, repo: ContentRepository): boolean {
  if (session.contentSource !== repo.kind) return false
  const round = session.activeRound
  if (!round) return isExhausted(session)
  const ref = session.order[session.position]
  if (!ref || ref.id !== round.puzzleId || ref.revision !== round.puzzleRevision) return false
  const playable = repo.getPlayablePuzzle({ id: round.puzzleId, revision: round.puzzleRevision })
  return playable !== null && playable.scoringVersion === round.scoringVersion
}
