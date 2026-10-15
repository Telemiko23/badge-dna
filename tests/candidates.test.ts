import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { devDailySchedule } from '../src/content/devSchedule.ts'
import { fixtureAssetUrls, fixtureRaw } from '../src/content/fixtures.ts'
import { buildRepository } from '../src/content/repository.ts'
import type { RawContent } from '../src/content/schemas.ts'
import { validateContent } from '../src/content/validate.ts'

const root = join(import.meta.dirname, '..', 'content')
const readAll = (dir: string): unknown[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const value: unknown = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      return Array.isArray(value) ? value : [value]
    })

const candidateRaw: RawContent = {
  contentVersion: 'test',
  clubs: readAll(join(root, 'clubs')),
  crests: readAll(join(root, 'candidates', 'crests')),
  elements: readAll(join(root, 'candidates', 'elements')),
  puzzles: readAll(join(root, 'candidates', 'puzzles')),
  daily: [],
  competitions: [],
}
type Row = Record<string, unknown>

describe('imported candidate content (metadata is tracked, assets are not)', () => {
  it('is structurally valid, ignoring whether the local asset files exist', () => {
    const issues = validateContent(candidateRaw, { kind: 'real', assetExists: () => true })
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
  })

  it('contains every Premier League 2026/27 club once, with 3 to 5 reveals per draft', () => {
    const competition = readAll(join(root, 'competitions'))[0] as { clubIds: string[] }
    const clubs = new Set((candidateRaw.puzzles as Row[]).map((p) => p.clubId))
    expect([...clubs].sort()).toEqual([...competition.clubIds].sort())
    for (const p of candidateRaw.puzzles as { revealOrder: string[] }[]) {
      expect(p.revealOrder.length).toBeGreaterThanOrEqual(3)
      expect(p.revealOrder.length).toBeLessThanOrEqual(5)
    }
  })

  it('is never published, approved or reviewed by anyone: those are the owner’s decisions', () => {
    for (const p of candidateRaw.puzzles as Row[]) {
      expect(p.status).toBe('draft')
      expect(p.reviewedBy).toBeNull()
      expect(p.reviewedAt).toBeNull()
      expect(p.difficultyStatus).toBe('uncalibrated')
    }
    for (const c of candidateRaw.crests as Row[]) {
      expect(c.rightsStatus).not.toBe('approved_for_project')
      expect(c.fidelityReviewed).toBe(false)
    }
    for (const e of candidateRaw.elements as Row[]) {
      expect(e.fidelityReviewed).toBe(false)
      expect(e.visualReviewed).toBe(false)
    }
  })

  it('never uses a piece its source flagged as incomplete', () => {
    const blocked = new Set((candidateRaw.elements as Row[]).filter((e) => e.autoSelectable === false).map((e) => e.id))
    expect(blocked.size).toBe(7)
    for (const p of candidateRaw.puzzles as { revealOrder: string[] }[]) {
      expect(p.revealOrder.filter((id) => blocked.has(id))).toEqual([])
    }
  })

  it('uses neutral asset paths and gives every club at least one draft', () => {
    for (const e of candidateRaw.elements as { assetPath: string }[]) expect(e.assetPath).toMatch(/^candidates\/e_[0-9a-f]{8}\.png$/)
    for (const c of candidateRaw.crests as { fullAssetPath: string }[]) expect(c.fullAssetPath).toMatch(/^candidates\/c_[0-9a-f]{8}\.png$/)
  })

  it('only a candidate repository offers drafts to play', () => {
    const asset = () => ''
    const asCandidate = buildRepository('candidate', candidateRaw, asset)
    const asReal = buildRepository('real', candidateRaw, asset)
    expect(asCandidate.playablePuzzles()).toHaveLength(candidateRaw.puzzles.length)
    expect(asReal.playablePuzzles()).toHaveLength(0)
    expect(asReal.publishedPuzzles()).toHaveLength(0)
  })

  it('a piece flagged as incomplete cannot be added to a puzzle', () => {
    const raw = structuredClone(candidateRaw)
    const blocked = (raw.elements as { id: string; crestVersionId: string; autoSelectable?: boolean }[]).find(
      (e) => e.autoSelectable === false,
    )!
    const puzzle = (raw.puzzles as { crestVersionId: string; revealOrder: string[] }[]).find(
      (p) => p.crestVersionId === blocked.crestVersionId,
    )!
    puzzle.revealOrder = [...puzzle.revealOrder.slice(0, 2), blocked.id]
    const codes = validateContent(raw, { kind: 'real', assetExists: () => true }).map((i) => i.code)
    expect(codes).toContain('element-not-selectable')
  })
})

describe('dev daily schedule for draft pools', () => {
  const pool = (candidateRaw.puzzles as { id: string; revision: number; clubId: string }[]).map(({ id, revision, clubId }) => ({
    id, revision, clubId,
  }))

  it('gives three different clubs a day, deterministically', () => {
    const a = devDailySchedule(pool, '2026-10-15', 'v')
    const b = devDailySchedule(pool, '2026-10-15', 'v')
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(7)
    for (const day of a as { puzzleRefs: { id: string }[] }[]) {
      const clubs = day.puzzleRefs.map((r) => pool.find((p) => p.id === r.id)!.clubId)
      expect(new Set(clubs).size).toBe(3)
    }
  })

  it('differs from day to day and yields nothing when fewer than three clubs exist', () => {
    const days = devDailySchedule(pool, '2026-10-15', 'v') as { puzzleRefs: { id: string }[] }[]
    expect(new Set(days.map((d) => d.puzzleRefs.map((r) => r.id).join())).size).toBeGreaterThan(5)
    expect(devDailySchedule(pool.slice(0, 1), '2026-10-15', 'v')).toEqual([])
  })

  it('produces entries the repository accepts as playable', () => {
    const raw = { ...candidateRaw, daily: devDailySchedule(pool, '2026-10-15', 'v') }
    const repo = buildRepository('candidate', raw, () => '')
    expect(repo.getValidDaily('2026-10-15')?.puzzleRefs).toHaveLength(3)
  })
})

describe('fixtures are unaffected by candidate support', () => {
  it('fixture puzzles still play as fixtures', () => {
    const repo = buildRepository('fixture', fixtureRaw, (p) => fixtureAssetUrls[p])
    expect(repo.playablePuzzles()).toHaveLength(repo.publishedPuzzles().length)
  })
})

describe('owner rule: a letter clue is never the first letter of the club name', () => {
  const codesOf = (raw: RawContent) => validateContent(raw, { kind: 'real', assetExists: () => true }).map((i) => i.code)
  const clubName = (id: unknown) =>
    (candidateRaw.clubs as { id: string; displayName: { en: string } }[]).find((c) => c.id === id)!.displayName.en

  it('no draft uses such a letter', () => {
    expect(codesOf(candidateRaw)).not.toContain('letter-is-initial')
  })

  it('the validator rejects one if it is added', () => {
    const raw = structuredClone(candidateRaw)
    const elements = raw.elements as { id: string; crestVersionId: string; letter?: string }[]
    const crests = raw.crests as { id: string; clubId: string }[]
    const bad = elements.find((e) => e.letter && e.letter === clubName(crests.find((c) => c.id === e.crestVersionId)!.clubId)[0].toUpperCase())!
    expect(bad).toBeDefined()
    const puzzle = (raw.puzzles as { crestVersionId: string; revealOrder: string[] }[]).find((p) => p.crestVersionId === bad.crestVersionId)!
    puzzle.revealOrder = [...puzzle.revealOrder.slice(0, 2), bad.id]
    expect(codesOf(raw)).toContain('letter-is-initial')
  })

  it('the three clubs whose supplied letter is their initial are Brighton, Everton and Ipswich', () => {
    const elements = candidateRaw.elements as { crestVersionId: string; letter?: string }[]
    const crests = candidateRaw.crests as { id: string; clubId: string }[]
    const initials = elements
      .filter((e) => e.letter)
      .map((e) => ({ club: crests.find((c) => c.id === e.crestVersionId)!.clubId, letter: e.letter! }))
      .filter((x) => x.letter === clubName(x.club)[0].toUpperCase())
      .map((x) => x.club)
      .sort()
    expect(initials).toEqual(['brighton', 'everton', 'ipswich-town'])
  })
})
