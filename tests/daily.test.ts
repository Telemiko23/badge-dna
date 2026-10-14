// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureAssetUrls, fixtureDailySchedule, fixtureRaw } from '../src/content/fixtures.ts'
import { buildRepository } from '../src/content/repository.ts'
import { DAILY_MAX_SCORE, dailyTotals } from '../src/domain/daily.ts'
import {
  markFirstElementLoaded,
  restoreRound,
  startReveal,
  submitGuess,
  type RoundState,
} from '../src/domain/round.ts'
import { en } from '../src/i18n/en.ts'
import { he } from '../src/i18n/he.ts'
import {
  advanceDaily,
  applyDailyRoundUpdate,
  canRestoreDaily,
  isDailyComplete,
  shareText,
  startDaily,
} from '../src/screens/dailySession.ts'
import { getDailyStatus } from '../src/screens/dailyStatus.ts'
import { acquireLock, isLockOwner, LOCK_TTL_MS, releaseLock } from '../src/storage/dailyLock.ts'
import { DailyProgressSchema, type DailyProgress } from '../src/storage/schemas.ts'
import { listDailyDates, loadDaily, saveDaily } from '../src/storage/stores.ts'

const TODAY = '2026-10-15'
const NOW = '2026-10-15T09:00:00.000Z'
const NOW_MS = Date.parse(NOW)

function repoFor(today = TODAY) {
  return buildRepository(
    'fixture',
    { ...fixtureRaw, daily: fixtureDailySchedule(today) },
    (p) => fixtureAssetUrls[p],
  )
}
const repo = repoFor()

const t = (dict: Record<string, string>) => (key: string, params?: Record<string, string | number>) =>
  dict[key].replace(/\{(\w+)\}/g, (_, k: string) => String(params?.[k]))

function answerOf(progress: DailyProgress): string {
  return repo.getPuzzle(progress.puzzleRefs[progress.currentRoundIndex])!.clubId
}

/** Play the current round: solve (after `reveals` extra reveals) or give up. */
function playRound(progress: DailyProgress, how: 'solve' | 'fail', extraReveals = 0): DailyProgress {
  const club = answerOf(progress)
  let round: RoundState = markFirstElementLoaded(progress.activeRound!)
  for (let i = 0; i < extraReveals; i++) {
    const pending = startReveal(round)
    round = { ...pending, pendingReveal: false, revealedCount: pending.revealedCount + 1 }
  }
  const guess = (id: string) =>
    submitGuess(round, { answerClubId: club, guessClubId: id, seenRevealedCount: round.revealedCount, now: NOW }).state
  if (how === 'solve') round = guess(club)
  else for (const id of ['x1', 'x2', 'x3']) round = guess(id)
  return applyDailyRoundUpdate(progress, round, club)
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('daily schedule (fixtures)', () => {
  it('has three different clubs every day and is explicit, not computed at play time', () => {
    const days = fixtureDailySchedule(TODAY)
    expect(days.length).toBeGreaterThanOrEqual(7)
    for (const day of days) {
      const entry = day as { puzzleRefs: { id: string }[]; dateUtc: string }
      expect(new Set(entry.puzzleRefs.map((r) => r.id)).size).toBe(3)
    }
    expect(repo.getValidDaily(TODAY)?.puzzleRefs).toHaveLength(3)
  })

  it('returns null for dates with no schedule instead of inventing a day', () => {
    expect(repo.getValidDaily('2030-01-01')).toBeNull()
  })

  it('refuses an entry whose puzzle is not published or whose clubs repeat', () => {
    const raw = { ...fixtureRaw, daily: fixtureDailySchedule(TODAY) }
    const broken = structuredClone(raw)
    ;(broken.puzzles[0] as { status: string }).status = 'draft'
    expect(buildRepository('fixture', broken, (p) => fixtureAssetUrls[p]).getValidDaily(TODAY)).toBeNull()

    const dup = structuredClone(raw)
    ;(dup.daily[3] as { puzzleRefs: unknown[] }).puzzleRefs[1] = (dup.daily[3] as { puzzleRefs: unknown[] }).puzzleRefs[0]
    expect(buildRepository('fixture', dup, (p) => fixtureAssetUrls[p]).getValidDaily(TODAY)).toBeNull()
  })
})

describe('daily session', () => {
  const entry = () => repo.getValidDaily(TODAY)!

  it('starts with frozen puzzle references and a loading daily round', () => {
    const p = startDaily(entry(), repo, NOW)!
    expect(p.puzzleRefs).toEqual(entry().puzzleRefs)
    expect(p.activeRound?.mode).toBe('daily')
    expect(p.currentRoundIndex).toBe(0)
    expect(DailyProgressSchema.safeParse(p).success).toBe(true)
  })

  it('plays all three rounds, totals once, and completes', () => {
    let p = startDaily(entry(), repo, NOW)!
    p = playRound(p, 'solve') // first reveal: 1000 for any N
    p = advanceDaily(p, repo, NOW)
    p = playRound(p, 'solve', 1)
    p = advanceDaily(p, repo, NOW)
    p = playRound(p, 'fail')
    expect(isDailyComplete(p)).toBe(false)
    p = advanceDaily(p, repo, NOW)

    expect(isDailyComplete(p)).toBe(true)
    expect(p.activeRound).toBeNull()
    expect(p.results).toHaveLength(3)
    const totals = dailyTotals(p.results)
    expect(totals.solved).toBe(2)
    expect(totals.maxScore).toBe(DAILY_MAX_SCORE)
    expect(totals.score).toBe(p.results[0].score + p.results[1].score)
    expect(p.results[0].score).toBe(1000)
    expect(p.results[2]).toMatchObject({ status: 'failed', score: 0 })
  })

  it('does not advance before the round is finished, and never double-records', () => {
    const p = startDaily(entry(), repo, NOW)!
    expect(advanceDaily(p, repo, NOW)).toBe(p)
    const done = playRound(p, 'solve')
    const again = applyDailyRoundUpdate(done, done.activeRound!, answerOf(done))
    expect(again.results).toHaveLength(1)
  })

  it('a completed challenge cannot be changed or restarted', () => {
    let p = startDaily(entry(), repo, NOW)!
    for (let i = 0; i < 3; i++) {
      p = advanceDaily(playRound(p, 'solve'), repo, NOW)
    }
    expect(isDailyComplete(p)).toBe(true)
    expect(advanceDaily(p, repo, NOW)).toBe(p)
    expect(applyDailyRoundUpdate(p, markFirstElementLoaded(startDaily(entry(), repo, NOW)!.activeRound!), 'x')).toBe(p)
  })

  it('restores only against the same frozen puzzle revisions', () => {
    const p = startDaily(entry(), repo, NOW)!
    expect(canRestoreDaily(p, repo)).toBe(true)
    expect(canRestoreDaily({ ...p, contentSource: 'real' }, repo)).toBe(false)
    const missing = { ...p, puzzleRefs: [{ id: p.puzzleRefs[0].id, revision: 9 }, p.puzzleRefs[1], p.puzzleRefs[2]] }
    expect(canRestoreDaily(missing, repo)).toBe(false)
    expect(canRestoreDaily({ ...p, activeRound: null }, repo)).toBe(false)
  })

  it('a reveal that was still loading when the page closed does not stay stuck', () => {
    const p = startDaily(entry(), repo, NOW)!
    const stuck = startReveal(markFirstElementLoaded(p.activeRound!))
    expect(stuck.pendingReveal).toBe(true)
    expect(restoreRound(stuck).pendingReveal).toBe(false)
    expect(restoreRound(stuck).revealedCount).toBe(1)
  })
})

describe('share text', () => {
  it('matches the spec format and contains no answers', () => {
    let p = startDaily(repo.getValidDaily(TODAY)!, repo, NOW)!
    p = advanceDaily(playRound(p, 'solve', 1), repo, NOW)
    p = advanceDaily(playRound(p, 'solve', 2), repo, NOW)
    p = advanceDaily(playRound(p, 'fail'), repo, NOW)
    const text = shareText(p, t(he) as never)
    const lines = text.split('\n')
    expect(lines[0]).toBe('Badge DNA · 2026-10-15')
    expect(lines[1]).toBe('פתרתי 2 מתוך 3')
    expect(lines[2]).toMatch(/^ניקוד \d+\/3000$/)
    expect(lines[3]).toMatch(/^רמזים בפתרונות \d\/\d, \d\/\d$/)

    for (const club of repo.clubs) {
      expect(text).not.toContain(club.displayName.he)
      expect(text).not.toContain(club.displayName.en)
    }
    for (const ref of p.puzzleRefs) expect(text).not.toContain(ref.id)
    expect(shareText(p, t(en) as never).split('\n')[1]).toBe('Solved 2 of 3')
  })

  it('omits the clue line when nothing was solved', () => {
    let p = startDaily(repo.getValidDaily(TODAY)!, repo, NOW)!
    for (let i = 0; i < 3; i++) p = advanceDaily(playRound(p, 'fail'), repo, NOW)
    expect(shareText(p, t(he) as never).split('\n')).toHaveLength(3)
  })
})

describe('daily storage and status', () => {
  const entry = () => repo.getValidDaily(TODAY)!

  it('round-trips a record per date and lists dates', () => {
    const p = startDaily(entry(), repo, NOW)!
    expect(loadDaily(TODAY).kind).toBe('none')
    expect(saveDaily(p)).toBe(true)
    expect(loadDaily(TODAY)).toEqual({ kind: 'ok', value: p })
    expect(listDailyDates()).toEqual([TODAY])
  })

  it('treats a damaged record as corrupt and leaves it in place', () => {
    localStorage.setItem('badge-dna:v1:daily:2026-10-15', '{"nope":')
    expect(loadDaily(TODAY).kind).toBe('corrupt')
    expect(localStorage.getItem('badge-dna:v1:daily:2026-10-15')).toBe('{"nope":')
    expect(getDailyStatus(repo, NOW_MS).today).toEqual({ kind: 'problem', date: TODAY })
  })

  it('reports not-started, in-progress and completed for today', () => {
    expect(getDailyStatus(repo, NOW_MS).today).toEqual({ kind: 'not-started', date: TODAY })
    let p = startDaily(entry(), repo, NOW)!
    saveDaily(p)
    expect(getDailyStatus(repo, NOW_MS).today).toMatchObject({ kind: 'in-progress', index: 1, total: 3 })
    for (let i = 0; i < 3; i++) p = advanceDaily(playRound(p, 'solve'), repo, NOW)
    saveDaily(p)
    expect(getDailyStatus(repo, NOW_MS).today).toEqual({ kind: 'completed', date: TODAY, score: 3000 })
  })

  it('says unavailable when there is no valid schedule for the date', () => {
    expect(getDailyStatus(repo, Date.parse('2031-01-01T00:00:00Z')).today).toEqual({ kind: 'unavailable' })
  })

  it('after the day changes, an unfinished challenge stays completable and the new day is separate', () => {
    const p = startDaily(entry(), repo, NOW)!
    saveDaily(p)
    const tomorrow = Date.parse('2026-10-16T00:00:01Z')
    const status = getDailyStatus(repo, tomorrow)
    expect(status.today).toEqual({ kind: 'not-started', date: '2026-10-16' })
    expect(status.older).toEqual({ date: TODAY, index: 1, total: 3 })
  })

  it('never offers a past challenge that was not started', () => {
    expect(getDailyStatus(repo, Date.parse('2026-10-16T00:00:01Z')).older).toBeNull()
  })

  it('reports storage as unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(getDailyStatus(repo, NOW_MS).today).toEqual({ kind: 'storage-unavailable' })
    expect(saveDaily(startDaily(entry(), repo, NOW)!)).toBe(false)
  })
})

describe('daily tab lock', () => {
  const T0 = 1_000_000

  it('first tab becomes the writer; a second tab is refused while the lease is fresh', () => {
    expect(acquireLock(TODAY, 'tab-a', T0)).toBe(true)
    expect(acquireLock(TODAY, 'tab-b', T0 + 1000)).toBe(false)
    expect(isLockOwner(TODAY, 'tab-a')).toBe(true)
    expect(isLockOwner(TODAY, 'tab-b')).toBe(false)
  })

  it('the writer renews its own lease', () => {
    acquireLock(TODAY, 'tab-a', T0)
    expect(acquireLock(TODAY, 'tab-a', T0 + 5000)).toBe(true)
    expect(acquireLock(TODAY, 'tab-b', T0 + LOCK_TTL_MS + 1000)).toBe(false) // renewed at +5s, still fresh
  })

  it('an expired lease can be taken over', () => {
    acquireLock(TODAY, 'tab-a', T0)
    expect(acquireLock(TODAY, 'tab-b', T0 + LOCK_TTL_MS + 1)).toBe(true)
    expect(isLockOwner(TODAY, 'tab-a')).toBe(false)
  })

  it('control can be moved on purpose, and only the owner can release', () => {
    acquireLock(TODAY, 'tab-a', T0)
    expect(acquireLock(TODAY, 'tab-b', T0 + 10, true)).toBe(true)
    releaseLock(TODAY, 'tab-a') // not the owner: no effect
    expect(isLockOwner(TODAY, 'tab-b')).toBe(true)
    releaseLock(TODAY, 'tab-b')
    expect(acquireLock(TODAY, 'tab-a', T0 + 20)).toBe(true)
  })

  it('locks for different dates are independent', () => {
    acquireLock('2026-10-14', 'tab-a', T0)
    expect(acquireLock('2026-10-15', 'tab-b', T0)).toBe(true)
  })

  it('without usable storage nobody becomes the writer', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(acquireLock(TODAY, 'tab-a', T0)).toBe(false)
  })
})
