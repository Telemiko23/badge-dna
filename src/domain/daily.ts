import { GAME_CONFIG } from './config.ts'

export const DAILY_MAX_SCORE = GAME_CONFIG.dailyPuzzleCount * GAME_CONFIG.scoring.maxScore

export interface FinishedRound {
  status: 'solved' | 'failed' | 'gave_up'
  score: number
}

/** The daily summary is always derived from recorded round results, never accumulated separately. */
export function dailyTotals(results: readonly FinishedRound[]): {
  score: number
  solved: number
  played: number
  maxScore: number
} {
  return {
    score: results.reduce((sum, r) => sum + r.score, 0),
    solved: results.filter((r) => r.status === 'solved').length,
    played: results.length,
    maxScore: DAILY_MAX_SCORE,
  }
}
