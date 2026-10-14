import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fixtureAssetUrls, fixtureRaw } from '../src/content/fixtures.ts'
import { realRawContent } from '../src/content/load.ts'
import { buildRepository, ContentError } from '../src/content/repository.ts'
import type { RawContent } from '../src/content/schemas.ts'
import { validateContent } from '../src/content/validate.ts'

const fixtureAssetExists = (p: string) => p in fixtureAssetUrls
const clone = (raw: RawContent): RawContent => structuredClone(raw)
const codes = (raw: RawContent, kind: 'real' | 'fixture' = 'fixture') =>
  validateContent(raw, { kind, assetExists: fixtureAssetExists })
    .filter((i) => i.severity === 'error')
    .map((i) => i.code)

describe('shipped content', () => {
  it('fixture content is valid', () => {
    expect(codes(fixtureRaw)).toEqual([])
  })

  it('real content is valid (currently: club names only, no puzzles)', () => {
    const real = realRawContent()
    const issues = validateContent(real, {
      kind: 'real',
      assetExists: (p) => existsSync(join(import.meta.dirname, '..', 'public', p)),
    })
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(real.puzzles).toEqual([])
  })

  it('fixture puzzles can never pass the publish gate of real content', () => {
    expect(codes(fixtureRaw, 'real')).toContain('publish-gate')
  })

  it('fixtures cover 3, 4 and 5 reveals, plus a sub-element', () => {
    const repo = buildRepository('fixture', fixtureRaw, (p) => fixtureAssetUrls[p])
    const sizes = repo.publishedPuzzles().map((p) => p.revealOrder.length).sort()
    expect(sizes).toEqual([3, 4, 5])
    expect(fixtureRaw.elements.some((e) => (e as { parentElementId: string | null }).parentElementId)).toBe(true)
  })

  it('every fixture asset path is neutral (no club name inside)', () => {
    for (const path of Object.keys(fixtureAssetUrls)) {
      expect(path).not.toMatch(/dragon|eagle|oak|sea/i)
    }
  })
})

describe('validator catches bad content', () => {
  it('schema violations', () => {
    const raw = clone(fixtureRaw)
    ;(raw.puzzles[0] as { revealOrder: string[] }).revealOrder = ['fx-e-a1', 'fx-e-a2']
    expect(codes(raw)).toContain('schema')
  })

  it('duplicate ids', () => {
    const raw = clone(fixtureRaw)
    raw.clubs.push(structuredClone(raw.clubs[0]))
    expect(codes(raw)).toContain('duplicate-id')
  })

  it('missing references', () => {
    const raw = clone(fixtureRaw)
    ;(raw.puzzles[0] as { clubId: string }).clubId = 'nope'
    expect(codes(raw)).toContain('missing-ref')
  })

  it('an element from another crest version', () => {
    const raw = clone(fixtureRaw)
    ;(raw.puzzles[0] as { revealOrder: string[] }).revealOrder = ['fx-e-a1', 'fx-e-a2', 'fx-e-b1']
    expect(codes(raw)).toContain('crest-mismatch')
  })

  it('a repeated element in the reveal order', () => {
    const raw = clone(fixtureRaw)
    ;(raw.puzzles[0] as { revealOrder: string[] }).revealOrder = ['fx-e-a1', 'fx-e-a2', 'fx-e-a1']
    expect(codes(raw)).toContain('reveal-duplicate')
  })

  it('missing asset files', () => {
    const raw = clone(fixtureRaw)
    ;(raw.elements[0] as { assetPath: string }).assetPath = 'fixtures/gone.svg'
    expect(codes(raw)).toContain('missing-asset')
  })

  it('an asset path that names the club', () => {
    const raw = clone(fixtureRaw)
    ;(raw.elements[0] as { assetPath: string }).assetPath = 'fixtures/dragons-wave.svg'
    expect(codes(raw)).toContain('asset-leak')
  })

  it('a published real puzzle without review, rights or fidelity checks', () => {
    const raw = clone(fixtureRaw)
    ;(raw.crests[0] as { rightsStatus: string }).rightsStatus = 'review_required'
    ;(raw.elements[0] as { visualReviewed: boolean }).visualReviewed = false
    const found = validateContent(raw, { kind: 'real', assetExists: fixtureAssetExists }).map((i) => i.message)
    expect(found.some((m) => m.includes('rightsStatus'))).toBe(true)
    expect(found.some((m) => m.includes('visually reviewed'))).toBe(true)
    expect(found.some((m) => m.includes('reviewedBy'))).toBe(true)
  })

  it('the same club twice in one daily challenge, or an unpublished puzzle', () => {
    const raw = clone(fixtureRaw)
    ;(raw.puzzles[2] as { status: string }).status = 'draft'
    raw.daily.push({
      id: 'd-1',
      dateUtc: '2026-10-15',
      puzzleRefs: [
        { id: 'fx-p-a', revision: 1 },
        { id: 'fx-p-a', revision: 1 },
        { id: 'fx-p-c', revision: 1 },
      ],
      contentVersion: 'x',
      scoringVersion: 'scoring-v1',
    })
    const found = codes(raw)
    expect(found).toContain('daily-duplicate-club')
    expect(found).toContain('daily-unpublished')
  })
})

describe('repository', () => {
  it('refuses content that fails the schema', () => {
    const raw = clone(fixtureRaw)
    ;(raw.clubs[0] as { id: string }).id = 'Bad Id'
    expect(() => buildRepository('fixture', raw, () => '')).toThrow(ContentError)
  })

  it('returns null for an unknown puzzle revision instead of mapping to something else', () => {
    const repo = buildRepository('fixture', fixtureRaw, (p) => fixtureAssetUrls[p])
    expect(repo.getPlayablePuzzle({ id: 'fx-p-a', revision: 99 })).toBeNull()
    expect(repo.getPlayablePuzzle({ id: 'fx-p-a', revision: 1 })?.totalReveals).toBe(3)
  })
})

describe('daily schedule validation', () => {
  const withDaily = async () => {
    const { fixtureDailySchedule } = await import('../src/content/fixtures.ts')
    return { ...clone(fixtureRaw), daily: fixtureDailySchedule('2026-10-15') }
  }
  const issues = (raw: RawContent) => validateContent(raw, { kind: 'fixture', assetExists: fixtureAssetExists })

  it('accepts a generated fixture schedule, warning only about consecutive-day repeats', async () => {
    const found = issues(await withDaily())
    expect(found.filter((i) => i.severity === 'error')).toEqual([])
    expect(found.some((i) => i.code === 'daily-consecutive-club')).toBe(true)
  })

  it('rejects an impossible calendar date and two entries for one date', async () => {
    const raw = await withDaily()
    ;(raw.daily[0] as { dateUtc: string }).dateUtc = '2026-02-30'
    ;(raw.daily[1] as { dateUtc: string; id: string }).dateUtc = (raw.daily[2] as { dateUtc: string }).dateUtc
    const found = issues(raw).map((i) => i.code)
    expect(found).toContain('bad-date')
    expect(found).toContain('duplicate-date')
  })
})
