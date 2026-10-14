import { GAME_CONFIG } from './config.ts'

const { scoring, minReveals, maxReveals, maxMistakes } = GAME_CONFIG

function assertInt(name: string, value: number): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer, got ${value}`)
}

/**
 * scoring-v1 base score: round10(1000 - 700 * (K - 1) / (N - 1)).
 * Computed with integers only, so half-way values round up exactly
 * (e.g. N=5, K=2 -> 825 -> 830) with no floating point drift.
 */
export function baseScore(totalReveals: number, revealed: number): number {
  assertInt('totalReveals', totalReveals)
  assertInt('revealed', revealed)
  if (totalReveals < minReveals || totalReveals > maxReveals) {
    throw new RangeError(`totalReveals must be ${minReveals}..${maxReveals}, got ${totalReveals}`)
  }
  if (revealed < 1 || revealed > totalReveals) {
    throw new RangeError(`revealed must be 1..${totalReveals}, got ${revealed}`)
  }
  const span = totalReveals - 1
  // value * span, kept as an integer
  const scaled = scoring.maxScore * span - scoring.spread * (revealed - 1)
  const half = (scoring.step / 2) * span
  return Math.floor((scaled + half) / (scoring.step * span)) * scoring.step
}

/** Score for solving with K reveals visible and W earlier mistakes. */
export function successScore(totalReveals: number, revealed: number, mistakes: number): number {
  assertInt('mistakes', mistakes)
  if (mistakes < 0 || mistakes > maxMistakes - 1) {
    throw new RangeError(`mistakes must be 0..${maxMistakes - 1} for a solved round, got ${mistakes}`)
  }
  return Math.max(
    scoring.floorScore,
    baseScore(totalReveals, revealed) - scoring.mistakePenalty * mistakes,
  )
}

export const FAILED_SCORE = 0
export const GAVE_UP_SCORE = 0
