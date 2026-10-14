import { describe, expect, it } from 'vitest'
import {
  canGuess,
  canReveal,
  completeReveal,
  createRound,
  failReveal,
  giveUp,
  markFirstElementLoaded,
  markTechnicalError,
  mistakeCount,
  possibleScore,
  retryLoading,
  scoreAfterNextReveal,
  startReveal,
  submitGuess,
  type RoundState,
} from '../src/domain/round.ts'

const ANSWER = 'club-answer'
const NOW = '2026-10-15T10:00:00.000Z'

function fresh(totalReveals = 4): RoundState {
  return createRound({
    sessionId: 's',
    roundId: 'r',
    mode: 'practice',
    puzzleId: 'p',
    puzzleRevision: 1,
    contentVersion: 'c',
    scoringVersion: 'scoring-v1',
    totalReveals,
    now: NOW,
  })
}

function active(totalReveals = 4): RoundState {
  return markFirstElementLoaded(fresh(totalReveals))
}

function guess(state: RoundState, clubId: string) {
  return submitGuess(state, { answerClubId: ANSWER, guessClubId: clubId, seenRevealedCount: state.revealedCount, now: NOW })
}

function reveal(state: RoundState): RoundState {
  return completeReveal(startReveal(state))
}

describe('round lifecycle', () => {
  it('starts loading with nothing revealed, then becomes active with exactly one element', () => {
    const loading = fresh()
    expect(loading.status).toBe('loading')
    expect(loading.revealedCount).toBe(0)
    expect(canGuess(loading)).toBe(false)
    const ready = markFirstElementLoaded(loading)
    expect(ready.status).toBe('active')
    expect(ready.revealedCount).toBe(1)
    expect(ready.guesses).toEqual([])
    expect(possibleScore(ready)).toBe(1000)
  })

  it('a failed first load is a technical error, not a game attempt, and can be retried', () => {
    const errored = markTechnicalError(fresh())
    expect(errored.status).toBe('technical_error')
    expect(errored.guesses).toHaveLength(0)
    expect(retryLoading(errored).status).toBe('loading')
  })

  it('markFirstElementLoaded is idempotent', () => {
    const ready = active()
    expect(markFirstElementLoaded(ready)).toBe(ready)
  })
})

describe('guessing', () => {
  it('a correct first guess solves with 1000 and records once', () => {
    const { state, outcome } = guess(active(), ANSWER)
    expect(outcome).toBe('correct')
    expect(state.status).toBe('solved')
    expect(state.finalScore).toBe(1000)
    expect(state.finishedAt).toBe(NOW)
  })

  it('a wrong guess adds a mistake and keeps elements unchanged', () => {
    const before = active()
    const { state, outcome } = guess(before, 'other')
    expect(outcome).toBe('wrong')
    expect(state.status).toBe('active')
    expect(state.revealedCount).toBe(before.revealedCount)
    expect(mistakeCount(state)).toBe(1)
    expect(possibleScore(state)).toBe(900)
  })

  it('spec example: 4 reveals, solve at 3 after one mistake = 430', () => {
    let s = active(4)
    s = guess(s, 'wrong-1').state
    s = reveal(reveal(s))
    expect(s.revealedCount).toBe(3)
    const { state } = guess(s, ANSWER)
    expect(state.finalScore).toBe(430)
  })

  it('the third wrong guess fails the round with 0 even when everything is revealed', () => {
    let s = active(3)
    s = reveal(reveal(s))
    s = guess(s, 'a').state
    s = guess(s, 'b').state
    const { state } = guess(s, 'c')
    expect(state.status).toBe('failed')
    expect(state.finalScore).toBe(0)
  })

  it('a repeated guess is not a new mistake and does not lower the score', () => {
    const first = guess(active(), 'dup').state
    const again = guess(first, 'dup')
    expect(again.outcome).toBe('duplicate')
    expect(again.state).toBe(first)
    expect(mistakeCount(again.state)).toBe(1)
  })

  it('empty input is ignored', () => {
    const s = active()
    expect(guess(s, '').outcome).toBe('ignored')
  })

  it('a guess made against a stale revealed count is ignored', () => {
    const s = active()
    const result = submitGuess(s, { answerClubId: ANSWER, guessClubId: ANSWER, seenRevealedCount: 2, now: NOW })
    expect(result.outcome).toBe('ignored')
  })

  it('cannot guess while an extra reveal is pending', () => {
    const pending = startReveal(active())
    expect(canGuess(pending)).toBe(false)
    expect(guess(pending, ANSWER).outcome).toBe('ignored')
  })

  it('nothing changes after the round is final', () => {
    const solved = guess(active(), ANSWER).state
    expect(guess(solved, 'x').outcome).toBe('ignored')
    expect(startReveal(solved)).toBe(solved)
    expect(giveUp(solved, NOW)).toBe(solved)
    const failed = ['a', 'b', 'c'].reduce((s, id) => guess(s, id).state, active())
    expect(failed.status).toBe('failed')
    expect(guess(failed, ANSWER).state).toBe(failed)
  })
})

describe('revealing', () => {
  it('adds exactly one element and lowers the possible score', () => {
    const s = active(4)
    expect(scoreAfterNextReveal(s)).toBe(770)
    const next = reveal(s)
    expect(next.revealedCount).toBe(2)
    expect(possibleScore(next)).toBe(770)
  })

  it('the possible-score preview matches the score actually obtained', () => {
    let s = active(5)
    s = guess(s, 'x').state
    const preview = scoreAfterNextReveal(s)
    s = reveal(s)
    expect(guess(s, ANSWER).state.finalScore).toBe(preview)
  })

  it('a failed load leaves the same active state and does not charge', () => {
    const s = active()
    const failed = failReveal(startReveal(s))
    expect(failed.pendingReveal).toBe(false)
    expect(failed.revealedCount).toBe(s.revealedCount)
    expect(possibleScore(failed)).toBe(possibleScore(s))
  })

  it('double start does nothing extra, and completing twice adds a single element', () => {
    const pending = startReveal(active())
    expect(startReveal(pending)).toBe(pending)
    const once = completeReveal(pending)
    expect(completeReveal(once)).toBe(once)
    expect(once.revealedCount).toBe(2)
  })

  it('revealing the last element does not end the round or expose the answer', () => {
    let s = active(3)
    s = reveal(reveal(s))
    expect(s.revealedCount).toBe(3)
    expect(s.status).toBe('active')
    expect(canReveal(s)).toBe(false)
    expect(scoreAfterNextReveal(s)).toBeNull()
    expect(guess(s, ANSWER).outcome).toBe('correct')
  })
})

describe('giving up', () => {
  it('ends with gave_up and zero points', () => {
    const s = giveUp(active(), NOW)
    expect(s.status).toBe('gave_up')
    expect(s.finalScore).toBe(0)
    expect(guess(s, ANSWER).outcome).toBe('ignored')
  })
})
