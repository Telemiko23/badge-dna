import { useCallback, useEffect, useRef, useState } from 'react'
import { newId } from '../screens/practiceSession.ts'
import {
  acquireLock,
  isLockOwner,
  LOCK_HEARTBEAT_MS,
  lockName,
  releaseLock,
} from '../storage/dailyLock.ts'
import { storageKey } from '../storage/safeStorage.ts'

/**
 * Makes this tab the single writer of a daily challenge. Other tabs get `writer: false`
 * (read-only) until the lease expires or the player takes control. Local reliability only.
 * `onAcquired` runs when this tab newly becomes the writer, so it can reload the latest saved state.
 */
export function useDailyLock(dateUtc: string, enabled: boolean, onAcquired?: () => void) {
  const [tabId] = useState(newId)
  const [writer, setWriter] = useState(false)
  const wasWriter = useRef(false)
  const acquiredRef = useRef(onAcquired)
  useEffect(() => {
    acquiredRef.current = onAcquired
  }, [onAcquired])

  const update = useCallback((next: boolean) => {
    if (next && !wasWriter.current) acquiredRef.current?.()
    wasWriter.current = next
    setWriter(next)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const renew = () => update(acquireLock(dateUtc, tabId, Date.now()))
    renew()
    const heartbeat = setInterval(renew, LOCK_HEARTBEAT_MS)
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(lockName(dateUtc))) update(isLockOwner(dateUtc, tabId))
    }
    const release = () => releaseLock(dateUtc, tabId)
    window.addEventListener('storage', onStorage)
    window.addEventListener('pagehide', release)
    return () => {
      clearInterval(heartbeat)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pagehide', release)
      release()
      wasWriter.current = false
    }
  }, [dateUtc, enabled, tabId, update])

  const takeOver = useCallback(() => {
    update(acquireLock(dateUtc, tabId, Date.now(), true))
  }, [dateUtc, tabId, update])

  return { writer: enabled && writer, takeOver }
}
