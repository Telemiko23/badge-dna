import { z } from 'zod'
import { readJson, writeJson } from './safeStorage.ts'

/**
 * Local-only event log for product checks (spec §17). Nothing is sent anywhere;
 * it is exported by hand from Settings in development builds. No free text.
 */
export type EventName =
  | 'round_started'
  | 'element_revealed'
  | 'guess_submitted'
  | 'round_completed'
  | 'daily_completed'
  | 'content_error'

const MAX_EVENTS = 500
const EventSchema = z.object({
  t: z.string(),
  name: z.string(),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
})
const LogSchema = z.array(EventSchema)
export type LoggedEvent = z.infer<typeof EventSchema>

export function logEvent(name: EventName, data: LoggedEvent['data']): void {
  const current = readJson('events', LogSchema)
  const events = current.kind === 'ok' ? current.value : []
  events.push({ t: new Date().toISOString(), name, data })
  writeJson('events', events.slice(-MAX_EVENTS))
}

export function exportEvents(): string {
  const current = readJson('events', LogSchema)
  return JSON.stringify(current.kind === 'ok' ? current.value : [], null, 2)
}
