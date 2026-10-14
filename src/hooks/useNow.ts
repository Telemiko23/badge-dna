import { useEffect, useState } from 'react'
import { nowMs } from '../clock.ts'

/** Re-renders on an interval with the current app time (ms). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(nowMs)
  useEffect(() => {
    const timer = setInterval(() => setNow(nowMs()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
