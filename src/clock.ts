/**
 * The app's notion of "now". In development builds only, `?now=2026-10-15T23:59:50Z`
 * starts the clock at that instant (and keeps it running), so day rollover can be
 * checked without waiting. Production builds always use the real clock.
 */
interface Override {
  baseMs: number
  startPerf: number
}

function readOverride(): Override | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('now')
  const baseMs = raw ? Date.parse(raw) : NaN
  return Number.isFinite(baseMs) ? { baseMs, startPerf: performance.now() } : null
}

const override = readOverride()

export function nowMs(): number {
  return override ? override.baseMs + (performance.now() - override.startPerf) : Date.now()
}

export function nowIso(): string {
  return new Date(nowMs()).toISOString()
}
