import { GAME_CONFIG } from './config.ts'
import { FAILED_SCORE, GAVE_UP_SCORE, successScore } from './scoring.ts'

export type RoundMode = 'practice' | 'daily'

export type RoundStatus =
  | 'loading'
  | 'active'
  | 'solved'
  | 'failed'
  | 'gave_up'
  | 'technical_error'

export interface GuessRecord {
  clubId: string
  /** Number of elements visible when the guess was submitted. */
  revealedCountAtGuess: number
  result: 'correct' | 'wrong'
  timestamp: string
}

/**
 * Everything the engine knows about a round. The answer club is deliberately
 * NOT part of the state; it is passed in only where a guess is judged.
 */
export interface RoundState {
  sessionId: string
  roundId: string
  mode: RoundMode
  puzzleId: string
  puzzleRevision: number
  contentVersion: string
  scoringVersion: string
  /** N: number of elements in the puzzle (3..5). */
  totalReveals: number
  /** K: elements currently visible. 0 only while status is `loading`. */
  revealedCount: number
  guesses: GuessRecord[]
  status: RoundStatus
  /** True while an additional element is loading; blocks guess/reveal. */
  pendingReveal: boolean
  startedAt: string
  finishedAt: string | null
  finalScore: number | null
}

export type GuessOutcome = 'correct' | 'wrong' | 'duplicate' | 'ignored'

export interface CreateRoundInput {
  sessionId: string
  roundId: string
  mode: RoundMode
  puzzleId: string
  puzzleRevision: number
  contentVersion: string
  scoringVersion: string
  totalReveals: number
  now: string
}

export function createRound(input: CreateRoundInput): RoundState {
  const { now, ...rest } = input
  return {
    ...rest,
    revealedCount: 0,
    guesses: [],
    status: 'loading',
    pendingReveal: false,
    startedAt: now,
    finishedAt: null,
    finalScore: null,
  }
}

export function isFinal(status: RoundStatus): boolean {
  return status === 'solved' || status === 'failed' || status === 'gave_up'
}

export function mistakeCount(state: RoundState): number {
  return state.guesses.filter((g) => g.result === 'wrong').length
}

export function mistakesLeft(state: RoundState): number {
  return Math.max(0, GAME_CONFIG.maxMistakes - mistakeCount(state))
}

export function hasGuessed(state: RoundState, clubId: string): boolean {
  return state.guesses.some((g) => g.clubId === clubId)
}

export function canReveal(state: RoundState): boolean {
  return state.status === 'active' && !state.pendingReveal && state.revealedCount < state.totalReveals
}

export function canGuess(state: RoundState): boolean {
  return state.status === 'active' && !state.pendingReveal
}

/** Score if the player solves the round right now. Same function as the final score. */
export function possibleScore(state: RoundState): number | null {
  if (state.status !== 'active' || state.revealedCount < 1) return null
  const mistakes = mistakeCount(state)
  if (mistakes >= GAME_CONFIG.maxMistakes) return null
  return successScore(state.totalReveals, state.revealedCount, mistakes)
}

/** Score if the player solves right after one more reveal; null when nothing is left to reveal. */
export function scoreAfterNextReveal(state: RoundState): number | null {
  if (!canReveal(state)) return null
  return successScore(state.totalReveals, state.revealedCount + 1, mistakeCount(state))
}

/** loading -> active once the first element has actually been displayed. */
export function markFirstElementLoaded(state: RoundState): RoundState {
  if (state.status !== 'loading') return state
  return { ...state, status: 'active', revealedCount: 1 }
}

/** The first element could not be loaded: no game attempt was started. */
export function markTechnicalError(state: RoundState): RoundState {
  if (state.status !== 'loading') return state
  return { ...state, status: 'technical_error' }
}

/** technical_error -> loading, for a retry. */
export function retryLoading(state: RoundState): RoundState {
  if (state.status !== 'technical_error') return state
  return { ...state, status: 'loading', revealedCount: 0 }
}

export function startReveal(state: RoundState): RoundState {
  if (!canReveal(state)) return state
  return { ...state, pendingReveal: true }
}

/** The extra element has been loaded and shown. Adds exactly one element. */
export function completeReveal(state: RoundState): RoundState {
  if (state.status !== 'active' || !state.pendingReveal) return state
  return { ...state, pendingReveal: false, revealedCount: state.revealedCount + 1 }
}

/** Loading the extra element failed: same active state, same revealedCount. */
export function failReveal(state: RoundState): RoundState {
  if (!state.pendingReveal) return state
  return { ...state, pendingReveal: false }
}

export interface SubmitGuessInput {
  answerClubId: string
  guessClubId: string
  /** How many elements the player was looking at when submitting. */
  seenRevealedCount: number
  now: string
}

export function submitGuess(
  state: RoundState,
  input: SubmitGuessInput,
): { state: RoundState; outcome: GuessOutcome } {
  const { answerClubId, guessClubId, seenRevealedCount, now } = input
  if (!canGuess(state) || !guessClubId || seenRevealedCount !== state.revealedCount) {
    return { state, outcome: 'ignored' }
  }
  if (hasGuessed(state, guessClubId)) {
    return { state, outcome: 'duplicate' }
  }

  if (guessClubId === answerClubId) {
    const record: GuessRecord = {
      clubId: guessClubId,
      revealedCountAtGuess: state.revealedCount,
      result: 'correct',
      timestamp: now,
    }
    const finalScore = successScore(state.totalReveals, state.revealedCount, mistakeCount(state))
    return {
      outcome: 'correct',
      state: {
        ...state,
        guesses: [...state.guesses, record],
        status: 'solved',
        finishedAt: now,
        finalScore,
      },
    }
  }

  const record: GuessRecord = {
    clubId: guessClubId,
    revealedCountAtGuess: state.revealedCount,
    result: 'wrong',
    timestamp: now,
  }
  const guesses = [...state.guesses, record]
  const failed = guesses.filter((g) => g.result === 'wrong').length >= GAME_CONFIG.maxMistakes
  return {
    outcome: 'wrong',
    state: {
      ...state,
      guesses,
      status: failed ? 'failed' : 'active',
      pendingReveal: false,
      finishedAt: failed ? now : null,
      finalScore: failed ? FAILED_SCORE : null,
    },
  }
}

export function giveUp(state: RoundState, now: string): RoundState {
  if (state.status !== 'active') return state
  return {
    ...state,
    status: 'gave_up',
    pendingReveal: false,
    finishedAt: now,
    finalScore: GAVE_UP_SCORE,
  }
}
