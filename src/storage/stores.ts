import { DEFAULT_LANG, GAME_CONFIG, type Lang } from '../domain/config.ts'
import { archiveRaw, readJson, readRaw, removeKey, writeJson, type ReadResult } from './safeStorage.ts'
import {
  PracticeProgressSchema,
  SettingsSchema,
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

export function loadLang(): Lang {
  const result = readJson(SETTINGS, SettingsSchema)
  return result.kind === 'ok' ? result.value.lang : DEFAULT_LANG
}

export function saveLang(lang: Lang): boolean {
  return writeJson(SETTINGS, { schemaVersion: GAME_CONFIG.storage.schemaVersion, lang })
}
