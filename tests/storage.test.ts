// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureAssetUrls, fixtureRaw } from '../src/content/fixtures.ts'
import { buildRepository } from '../src/content/repository.ts'
import { clearAllLocalData, readJson, storageKey, writeJson } from '../src/storage/safeStorage.ts'
import { PracticeProgressSchema } from '../src/storage/schemas.ts'
import { archivePractice, loadLang, loadPractice, saveLang, savePractice } from '../src/storage/stores.ts'
import { newSession } from '../src/screens/practiceSession.ts'

const repo = buildRepository('fixture', fixtureRaw, (p) => fixtureAssetUrls[p])

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('practice storage', () => {
  it('round-trips a session', () => {
    const session = newSession(repo, '2026-10-15T10:00:00.000Z', 3)!
    expect(loadPractice().kind).toBe('none')
    expect(savePractice(session)).toBe(true)
    const loaded = loadPractice()
    expect(loaded.kind).toBe('ok')
    if (loaded.kind === 'ok') expect(loaded.value).toEqual(session)
  })

  it('reports corrupt data instead of using it, and keeps the original aside', () => {
    localStorage.setItem(storageKey('practice'), '{"schemaVersion":1,"results":"nope"')
    expect(loadPractice().kind).toBe('corrupt')
    localStorage.setItem(storageKey('practice'), JSON.stringify({ schemaVersion: 1, sessionId: 'x' }))
    expect(loadPractice().kind).toBe('corrupt')

    archivePractice()
    expect(localStorage.getItem(storageKey('practice'))).toBeNull()
    expect(localStorage.getItem(storageKey('practice-backup'))).toContain('"sessionId":"x"')
  })

  it('rejects a score that is outside what the rules allow', () => {
    const session = newSession(repo, '2026-10-15T10:00:00.000Z', 3)!
    const tampered = { ...session, results: [{ roundId: 'r', puzzleId: 'p', puzzleRevision: 1, clubId: 'c', status: 'solved', score: 99999, revealedCount: 1, totalReveals: 3, mistakes: 0, finishedAt: 'x' }] }
    expect(PracticeProgressSchema.safeParse(tampered).success).toBe(false)
  })

  it('treats blocked storage as unavailable without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(readJson('practice', PracticeProgressSchema).kind).toBe('unavailable')
    expect(writeJson('practice', {})).toBe(false)
    expect(savePractice(newSession(repo, '2026-10-15T10:00:00.000Z', 3)!)).toBe(false)
  })
})

describe('settings and reset', () => {
  it('remembers the language, defaulting to Hebrew', () => {
    expect(loadLang()).toBe('he')
    saveLang('en')
    expect(loadLang()).toBe('en')
  })

  it('reset removes only badge-dna keys', () => {
    saveLang('en')
    savePractice(newSession(repo, '2026-10-15T10:00:00.000Z', 3)!)
    localStorage.setItem('someone-else', 'keep')
    clearAllLocalData()
    expect(loadLang()).toBe('he')
    expect(loadPractice().kind).toBe('none')
    expect(localStorage.getItem('someone-else')).toBe('keep')
  })
})
