import { z } from 'zod'
import { GAME_CONFIG } from '../domain/config.ts'

export const GuessRecordSchema = z.strictObject({
  clubId: z.string().min(1),
  revealedCountAtGuess: z.number().int().min(1),
  result: z.enum(['correct', 'wrong']),
  timestamp: z.string(),
})

export const RoundStateSchema = z.strictObject({
  sessionId: z.string().min(1),
  roundId: z.string().min(1),
  mode: z.enum(['practice', 'daily']),
  puzzleId: z.string().min(1),
  puzzleRevision: z.number().int().min(1),
  contentVersion: z.string().min(1),
  scoringVersion: z.string().min(1),
  totalReveals: z.number().int().min(GAME_CONFIG.minReveals).max(GAME_CONFIG.maxReveals),
  revealedCount: z.number().int().min(0).max(GAME_CONFIG.maxReveals),
  guesses: z.array(GuessRecordSchema).max(GAME_CONFIG.maxMistakes + 1),
  status: z.enum(['loading', 'active', 'solved', 'failed', 'gave_up', 'technical_error']),
  pendingReveal: z.boolean(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  finalScore: z.number().int().min(0).max(GAME_CONFIG.scoring.maxScore).nullable(),
})

export const RoundResultSchema = z.strictObject({
  roundId: z.string().min(1),
  puzzleId: z.string().min(1),
  puzzleRevision: z.number().int().min(1),
  clubId: z.string().min(1),
  status: z.enum(['solved', 'failed', 'gave_up']),
  score: z.number().int().min(0).max(GAME_CONFIG.scoring.maxScore),
  revealedCount: z.number().int().min(1),
  totalReveals: z.number().int().min(1),
  mistakes: z.number().int().min(0),
  finishedAt: z.string(),
})

const PuzzleRefSchema = z.strictObject({ id: z.string().min(1), revision: z.number().int().min(1) })

export const PracticeProgressSchema = z.strictObject({
  schemaVersion: z.literal(GAME_CONFIG.storage.schemaVersion),
  sessionId: z.string().min(1),
  seed: z.number().int(),
  contentSource: z.enum(['real', 'candidate', 'fixture']),
  order: z.array(PuzzleRefSchema),
  position: z.number().int().min(0),
  /** Cumulative over the browser session, across pool cycles. */
  results: z.array(RoundResultSchema),
  activeRound: RoundStateSchema.nullable(),
})

/**
 * One record per game date. `puzzleRefs` is a frozen copy of the schedule entry the
 * player started with, so later content changes never swap a puzzle mid-challenge.
 */
export const DailyProgressSchema = z.strictObject({
  schemaVersion: z.literal(GAME_CONFIG.storage.schemaVersion),
  dailyId: z.string().min(1),
  dateUtc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionId: z.string().min(1),
  contentVersion: z.string().min(1),
  scoringVersion: z.string().min(1),
  contentSource: z.enum(['real', 'candidate', 'fixture']),
  puzzleRefs: z.array(PuzzleRefSchema).length(GAME_CONFIG.dailyPuzzleCount),
  /** 0..2 while playing; equals the number of puzzles once the challenge is complete. */
  currentRoundIndex: z.number().int().min(0).max(GAME_CONFIG.dailyPuzzleCount),
  results: z.array(RoundResultSchema).max(GAME_CONFIG.dailyPuzzleCount),
  activeRound: RoundStateSchema.nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
})

export const SettingsSchema = z.strictObject({
  schemaVersion: z.literal(GAME_CONFIG.storage.schemaVersion),
  lang: z.enum(['he', 'en']),
})

export type RoundResult = z.infer<typeof RoundResultSchema>
export type PracticeProgress = z.infer<typeof PracticeProgressSchema>
export type DailyProgress = z.infer<typeof DailyProgressSchema>
export type Settings = z.infer<typeof SettingsSchema>
