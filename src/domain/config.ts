/**
 * Single source of truth for game constants (spec §3.2, §7, §8).
 * Do not scatter these numbers across UI components.
 */
export const GAME_CONFIG = {
  scoringVersion: 'scoring-v1',
  minReveals: 3,
  maxReveals: 5,
  /** The third wrong guess ends the round as failed. */
  maxMistakes: 3,
  dailyPuzzleCount: 3,
  scoring: {
    maxScore: 1000,
    /** Score drop between first and last reveal. */
    spread: 700,
    mistakePenalty: 100,
    floorScore: 100,
    /** round10: rounding step, half rounds up. */
    step: 10,
  },
  search: {
    minChars: 2,
    maxSuggestions: 8,
  },
  storage: {
    namespace: 'badge-dna',
    schemaVersion: 1,
  },
} as const

/** Supported UI languages, in dropdown order. Add a language here and in src/i18n. */
export const LANGS = ['he', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'he'
