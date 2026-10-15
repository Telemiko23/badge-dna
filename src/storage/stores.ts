import { z } from 'zod'
import { DEFAULT_LANG, GAME_CONFIG, type Lang } from '../domain/config.ts'
import { archiveRaw, listNames, readJson, readRaw, removeKey, writeJson, type ReadResult } from './safeStorage.ts'
import {
  DailyProgressSchema,
  PracticeProgressSchema,
  SettingsSchema,
  type DailyProgress,
  type PracticeProgress,
} from './schemas.ts'

const PRACTICE = 'practice'
const SETTINGS = 'settings'

export function loadPractice(): ReadResult<PracticeProgress> {
  return readJson(PRACTICE, PracticeProgressSchema)
}

export function savePractice(progress: PracticeProgress): boolean {
  return writeJson(PRACTICE, progress)
}

/** Move the current practice record aside (e.g. before starting over after a restore problem). */
export function archivePractice(): void {
  const raw = readRaw(PRACTICE)
  if (raw !== null) archiveRaw(PRACTICE, raw)
  removeKey(PRACTICE)
}

const DAILY_PREFIX = 'daily:'
const dailyName = (dateUtc: string) => `${DAILY_PREFIX}${dateUtc}`

export function loadDaily(dateUtc: string): ReadResult<DailyProgress> {
  return readJson(dailyName(dateUtc), DailyProgressSchema)
}

export function saveDaily(progress: DailyProgress): boolean {
  return writeJson(dailyName(progress.dateUtc), progress)
}

/** Dates (YYYY-MM-DD) that have a stored daily record, oldest first. */
export function listDailyDates(): string[] {
  return listNames(DAILY_PREFIX).map((name) => name.slice(DAILY_PREFIX.length))
}

const SEEN = 'seen-elements'
const MAX_SEEN = 5000

/** Element ids the player has already had revealed, across sessions (used to vary what is shown next). */
export function loadSeenElements(): Set<string> {
  const result = readJson(SEEN, z.array(z.string()))
  return new Set(result.kind === 'ok' ? result.value : [])
}

export function rememberSeenElements(ids: readonly string[]): void {
  const seen = loadSeenElements()
  let changed = false
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id)
      changed = true
    }
  }
  if (changed) writeJson(SEEN, [...seen].slice(-MAX_SEEN))
}

export function loadLang(): Lang {
  const result = readJson(SETTINGS, SettingsSchema)
  return result.kind === 'ok' ? result.value.lang : DEFAULT_LANG
}

export function saveLang(lang: Lang): boolean {
  return writeJson(SETTINGS, { schemaVersion: GAME_CONFIG.storage.schemaVersion, lang })
}
