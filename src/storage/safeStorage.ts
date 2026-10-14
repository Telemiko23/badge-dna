import type { z } from 'zod'
import { GAME_CONFIG } from '../domain/config.ts'

const { namespace, schemaVersion } = GAME_CONFIG.storage

export function storageKey(name: string): string {
  return `${namespace}:v${schemaVersion}:${name}`
}

/** localStorage, or null when it is blocked, full-quota'd or otherwise unusable. */
export function getStorage(): Storage | null {
  try {
    const storage = window.localStorage
    const probe = `${namespace}:probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

export type ReadResult<T> =
  | { kind: 'none' }
  | { kind: 'ok'; value: T }
  /** Stored but unreadable or invalid. Never used for scoring; kept for the owner to inspect. */
  | { kind: 'corrupt'; raw: string }
  | { kind: 'unavailable' }

export function readJson<T>(name: string, schema: z.ZodType<T>): ReadResult<T> {
  const storage = getStorage()
  if (!storage) return { kind: 'unavailable' }
  let raw: string | null
  try {
    raw = storage.getItem(storageKey(name))
  } catch {
    return { kind: 'unavailable' }
  }
  if (raw === null) return { kind: 'none' }
  try {
    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? { kind: 'ok', value: parsed.data } : { kind: 'corrupt', raw }
  } catch {
    return { kind: 'corrupt', raw }
  }
}

/** Returns false when the value could not be saved. */
export function writeJson(name: string, value: unknown): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(storageKey(name), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(name: string): void {
  try {
    getStorage()?.removeItem(storageKey(name))
  } catch {
    /* nothing to do */
  }
}

/** Keep the original record under a backup key instead of silently discarding it. */
export function archiveRaw(name: string, raw: string): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(storageKey(`${name}-backup`), raw)
    return true
  } catch {
    return false
  }
}

export function readRaw(name: string): string | null {
  try {
    return getStorage()?.getItem(storageKey(name)) ?? null
  } catch {
    return null
  }
}

/** Names (without namespace/version) of stored records whose name starts with `prefix`. */
export function listNames(prefix: string): string[] {
  const storage = getStorage()
  if (!storage) return []
  const start = storageKey(prefix)
  const cut = storageKey('').length
  try {
    const names: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(start)) names.push(key.slice(cut))
    }
    return names.sort()
  } catch {
    return []
  }
}

/** Removes every key under the badge-dna namespace (settings reset). */
export function clearAllLocalData(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    const doomed: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(`${namespace}:`)) doomed.push(key)
    }
    doomed.forEach((key) => storage.removeItem(key))
  } catch {
    /* nothing to do */
  }
}
