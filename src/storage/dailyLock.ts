import { z } from 'zod'
import { readJson, removeKey, writeJson } from './safeStorage.ts'

/**
 * Single-writer lease for a daily challenge across browser tabs (spec §15).
 * This protects local progress from two tabs overwriting each other. It is a
 * reliability mechanism only, not an anti-cheat measure.
 */
export const LOCK_TTL_MS = 15_000
export const LOCK_HEARTBEAT_MS = 5_000

const LockSchema = z.object({ tabId: z.string(), expiresAt: z.number() })
type Lock = z.infer<typeof LockSchema>

export const lockName = (dateUtc: string) => `daily-lock:${dateUtc}`

function readLock(dateUtc: string): Lock | null {
  const result = readJson(lockName(dateUtc), LockSchema)
  return result.kind === 'ok' ? result.value : null
}

/**
 * Take (or renew) the lease. Fails while another tab holds an unexpired lease,
 * unless `force` is set ("take control"). Returns whether this tab is the writer.
 */
export function acquireLock(dateUtc: string, tabId: string, now: number, force = false): boolean {
  const current = readLock(dateUtc)
  const free = !current || current.expiresAt <= now || current.tabId === tabId
  if (!free && !force) return false
  if (!writeJson(lockName(dateUtc), { tabId, expiresAt: now + LOCK_TTL_MS })) return false
  return readLock(dateUtc)?.tabId === tabId // lost a simultaneous write?
}

export function isLockOwner(dateUtc: string, tabId: string): boolean {
  return readLock(dateUtc)?.tabId === tabId
}

export function releaseLock(dateUtc: string, tabId: string): void {
  if (isLockOwner(dateUtc, tabId)) removeKey(lockName(dateUtc))
}
