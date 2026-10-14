import { describe, expect, it } from 'vitest'
import { addDays, dayStartMs, gameDateUtc, isValidDateUtc, nextRolloverMs, timeLeft } from '../src/domain/dates.ts'

describe('game date (UTC)', () => {
  it('changes exactly at 00:00 UTC', () => {
    expect(gameDateUtc(Date.parse('2026-10-15T23:59:59.999Z'))).toBe('2026-10-15')
    expect(gameDateUtc(Date.parse('2026-10-16T00:00:00.000Z'))).toBe('2026-10-16')
  })

  it('does not depend on the viewer time zone', () => {
    // Same instant written in several offsets: 2026-10-16T01:30Z
    const instants = ['2026-10-16T01:30:00Z', '2026-10-15T21:30:00-04:00', '2026-10-16T04:30:00+03:00', '2026-10-15T20:30:00-05:00']
    for (const iso of instants) expect(gameDateUtc(Date.parse(iso))).toBe('2026-10-16')
  })

  it('is stable around daylight-saving changes (Israel 2026-10-25, US 2026-11-01)', () => {
    expect(gameDateUtc(Date.parse('2026-10-24T21:59:59Z'))).toBe('2026-10-24')
    expect(gameDateUtc(Date.parse('2026-10-24T22:00:00Z'))).toBe('2026-10-24')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(nextRolloverMs(Date.parse('2026-10-25T10:00:00Z')) - dayStartMs('2026-10-25')).toBe(86_400_000)
  })

  it('computes the next rollover and the time left', () => {
    const now = Date.parse('2026-10-15T20:15:30Z')
    expect(new Date(nextRolloverMs(now)).toISOString()).toBe('2026-10-16T00:00:00.000Z')
    expect(timeLeft(now)).toEqual({ hours: 3, minutes: 45 })
    expect(timeLeft(Date.parse('2026-10-15T23:59:59Z'))).toEqual({ hours: 0, minutes: 1 })
    expect(timeLeft(Date.parse('2026-10-15T00:00:00Z'))).toEqual({ hours: 24, minutes: 0 })
  })

  it('validates calendar dates', () => {
    expect(isValidDateUtc('2026-02-28')).toBe(true)
    expect(isValidDateUtc('2026-02-30')).toBe(false)
    expect(isValidDateUtc('2026-13-01')).toBe(false)
    expect(isValidDateUtc('2026-1-1')).toBe(false)
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
