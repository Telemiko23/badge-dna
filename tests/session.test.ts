import { describe, expect, it } from 'vitest'
import { fixtureAssetUrls, fixtureRaw } from '../src/content/fixtures.ts'
import { buildRepository } from '../src/content/repository.ts'
import { markFirstElementLoaded, submitGuess } from '../src/domain/round.ts'
import {
  advance,
  applyRoundUpdate,
  canRestore,
  isExhausted,
  newSession,
  startNewCycle,
} from '../src/screens/practiceSession.ts'

const repo = buildRepository('fixture', fixtureRaw, (p) => fixtureAssetUrls[p])
const NOW = '2026-10-15T10:00:00.000Z'

function session() {
  const s = newSession(repo, NOW, 7)
  if (!s) throw new Error('fixture pool is empty')
  return s
}

describe('practice session', () => {
  it('shuffles once and keeps the order for a given seed', () => {
    expect(newSession(repo, NOW, 7)?.order).toEqual(newSession(repo, NOW, 7)?.order)
    expect(session().order).toHaveLength(3)
  })

  it('records a finished round exactly once, however often it is applied', () => {
    let s = session()
    const round = markFirstElementLoaded(s.activeRound!)
    const playable = repo.getPlayablePuzzle(s.order[0])!
    const solved = submitGuess(round, {
      answerClubId: playable.clubId,
      guessClubId: playable.clubId,
      seenRevealedCount: 1,
      now: NOW,
    }).state
    s = applyRoundUpdate(s, solved, playable.clubId)
    s = applyRoundUpdate(s, solved, playable.clubId)
    s = applyRoundUpdate(s, solved, playable.clubId)
    expect(s.results).toHaveLength(1)
    expect(s.results[0]).toMatchObject({ status: 'solved', score: 1000, revealedCount: 1 })
  })

  it('walks through the pool, exhausts it, and starts a new cycle without repeating the last club first', () => {
    let s = session()
    for (let i = 0; i < 3; i++) {
      s = advance(s, repo, NOW)
    }
    expect(isExhausted(s)).toBe(true)
    expect(s.activeRound).toBeNull()
    const lastClub = repo.getPuzzle(s.order[2])!.clubId
    const cycle = { ...s, results: [{ ...resultStub(), clubId: lastClub }] }
    const next = startNewCycle(cycle, repo, NOW)!
    expect(next.position).toBe(0)
    expect(repo.getPuzzle(next.order[0])!.clubId).not.toBe(lastClub)
  })

  it('restores only when puzzle revision and content source still match', () => {
    const s = session()
    expect(canRestore(s, repo)).toBe(true)
    expect(canRestore({ ...s, contentSource: 'real' }, repo)).toBe(false)
    const stale = { ...s, activeRound: { ...s.activeRound!, puzzleRevision: 99 } }
    expect(canRestore(stale, repo)).toBe(false)
    const wrongScoring = { ...s, activeRound: { ...s.activeRound!, scoringVersion: 'scoring-v0' } }
    expect(canRestore(wrongScoring, repo)).toBe(false)
  })
})

function resultStub() {
  return {
    roundId: 'r',
    puzzleId: 'p',
    puzzleRevision: 1,
    clubId: 'x',
    status: 'solved' as const,
    score: 100,
    revealedCount: 1,
    totalReveals: 3,
    mistakes: 0,
    finishedAt: NOW,
  }
}
