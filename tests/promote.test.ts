import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Puzzle, RawContent } from '../src/content/schemas.ts'
import { validateContent } from '../src/content/validate.ts'
import { puzzleKey, puzzleSignature, type ReviewFile } from '../src/review/schema.ts'
import { planDaily, planPromotion, type PlanInput } from '../scripts/promote-lib.ts'

const content = join(import.meta.dirname, '..', 'content')
const readAll = (dir: string): unknown[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const v: unknown = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      return Array.isArray(v) ? v : [v]
    })

const candidate = {
  crests: readAll(join(content, 'candidates', 'crests')),
  elements: readAll(join(content, 'candidates', 'elements')),
  puzzles: readAll(join(content, 'candidates', 'puzzles')) as Puzzle[],
}
const clubs = readAll(join(content, 'clubs'))
const confirmations = { crestMatchesSource: true, piecesFaithfulAndReadable: true, orderAcceptable: true }
const rights = { decidedBy: 'Owner', decidedAt: '2026-10-15', text: 'Owner decision: fan quiz; no licence.' }
const TODAY = '2026-10-20'

/** A synthetic review file: this is TEST DATA, not the owner's decisions. */
function reviewFor(puzzles: Puzzle[], overrides: Partial<ReviewFile['puzzles'][string]> = {}): ReviewFile {
  return {
    schemaVersion: 1,
    reviewer: 'Test Reviewer',
    puzzles: Object.fromEntries(
      puzzles.map((p) => [
        puzzleKey(p),
        {
          decision: 'approved' as const,
          note: '',
          decidedAt: '2026-10-16T10:00:00.000Z',
          signature: puzzleSignature(p),
          confirmations,
          ...overrides,
        },
      ]),
    ),
  }
}
const onePerClub = (n: number) => {
  const seen = new Set<string>()
  return candidate.puzzles.filter((p) => !seen.has(p.clubId) && seen.add(p.clubId)).slice(0, n)
}
const base = (review: ReviewFile, over: Partial<PlanInput> = {}): PlanInput => ({
  candidate,
  existing: { crests: [], elements: [], puzzles: [], daily: [] },
  review,
  rights,
  today: TODAY,
  contentVersion: 'test-1',
  dailyDays: 7,
  ...over,
})
const validate = (plan: ReturnType<typeof planPromotion>) => {
  const raw: RawContent = {
    contentVersion: 'test-1',
    clubs,
    crests: plan.crests,
    elements: plan.elements,
    puzzles: plan.puzzles,
    daily: plan.daily,
    competitions: [],
  }
  return validateContent(raw, { kind: 'real', assetExists: () => true })
}

describe('promotion', () => {
  it('publishes nothing without approvals', () => {
    const plan = planPromotion(base({ schemaVersion: 1, reviewer: '', puzzles: {} }))
    expect(plan.puzzles).toEqual([])
    expect(plan.daily).toEqual([])
    expect(plan.assetCopies).toEqual([])
  })

  it('publishes only what was approved, with review data copied from the decision', () => {
    const approved = onePerClub(4)
    const plan = planPromotion(base(reviewFor(approved)))
    expect(plan.puzzles).toHaveLength(4)
    for (const p of plan.puzzles) {
      expect(p).toMatchObject({ status: 'published', reviewedBy: 'Test Reviewer', reviewedAt: '2026-10-16T10:00:00.000Z' })
    }
    const used = new Set(approved.flatMap((p) => p.revealOrder))
    expect(new Set(plan.elements.map((e) => e.id))).toEqual(used)
    expect(plan.crests).toHaveLength(4)
    expect(plan.assetCopies).toHaveLength(plan.crests.length + plan.elements.length)
  })

  it('records the rights basis and the review flags, and the result passes the real publish gates', () => {
    const plan = planPromotion(base(reviewFor(onePerClub(4))))
    for (const c of plan.crests) {
      expect(c.rightsStatus).toBe('approved_for_project')
      expect(c.rightsEvidence).toContain('no licence')
      expect(c.fidelityReviewed).toBe(true)
      expect(c.fullAssetPath).toMatch(/^assets\/c_[0-9a-f]{8}\.png$/)
    }
    for (const e of plan.elements) {
      expect(e.fidelityReviewed && e.visualReviewed).toBe(true)
      expect(e.assetPath).toMatch(/^assets\/e_[0-9a-f]{8}\.png$/)
    }
    expect(validate(plan).filter((i) => i.severity === 'error')).toEqual([])
  })

  it('ignores "needs changes" and "rejected"', () => {
    const [a, b, c] = onePerClub(3)
    const review = reviewFor([a])
    review.puzzles[puzzleKey(b)] = { ...review.puzzles[puzzleKey(a)], decision: 'changes' }
    review.puzzles[puzzleKey(c)] = { ...review.puzzles[puzzleKey(a)], decision: 'rejected' }
    expect(planPromotion(base(review)).puzzles.map(puzzleKey)).toEqual([puzzleKey(a)])
  })

  it('refuses an approval whose puzzle changed afterwards', () => {
    const [p] = onePerClub(1)
    const plan = planPromotion(base(reviewFor([p], { signature: 'something-else' })))
    expect(plan.puzzles).toEqual([])
    expect(plan.skipped[0].reason).toContain('changed after it was approved')
  })

  it('refuses a puzzle that does not exist, and one that uses a piece flagged incomplete', () => {
    const [p] = onePerClub(1)
    const ghost = reviewFor([p])
    ghost.puzzles['pz_missing@1'] = ghost.puzzles[puzzleKey(p)]
    expect(planPromotion(base(ghost)).skipped.map((s) => s.key)).toContain('pz_missing@1')

    const blockedId = (candidate.elements as { id: string; autoSelectable?: boolean }[]).find((e) => e.autoSelectable === false)!.id
    const changed = { ...p, revealOrder: [...p.revealOrder.slice(0, 2), blockedId] }
    const tampered = { ...candidate, puzzles: candidate.puzzles.map((q) => (q === p ? changed : q)) }
    const plan = planPromotion({ ...base(reviewFor([changed])), candidate: tampered })
    expect(plan.puzzles).toEqual([])
    expect(plan.skipped[0].reason).toContain('flagged as incomplete')
  })

  it('is idempotent, and never lets a published revision change', () => {
    const approved = onePerClub(4)
    const first = planPromotion(base(reviewFor(approved)))
    const again = planPromotion(base(reviewFor(approved), { existing: first }))
    expect(again.newPuzzleKeys).toEqual([])
    expect(again.puzzles).toEqual(first.puzzles)

    // Same id and revision, another order: the approval is valid for the new draft, but it must not replace the published one.
    const changed = { ...approved[0], revealOrder: [...approved[0].revealOrder].reverse() }
    const tampered = { ...candidate, puzzles: candidate.puzzles.map((q) => (q.id === changed.id ? changed : q)) }
    const plan = planPromotion({ ...base(reviewFor([changed]), { existing: first }), candidate: tampered })
    expect(plan.skipped[0].reason).toContain('cannot change')
    expect(plan.puzzles.find((q) => q.id === changed.id)!.revealOrder).toEqual(approved[0].revealOrder)
  })

  it('warns, but does not unpublish, when an approval was later withdrawn', () => {
    const approved = onePerClub(3)
    const first = planPromotion(base(reviewFor(approved)))
    const withdrawn = reviewFor(approved)
    withdrawn.puzzles[puzzleKey(approved[0])].decision = 'changes'
    const plan = planPromotion(base(withdrawn, { existing: first }))
    expect(plan.puzzles).toHaveLength(3)
    expect(plan.warnings[0]).toContain(puzzleKey(approved[0]))
  })
})

describe('daily schedule from promoted puzzles', () => {
  const published = (n: number) => planPromotion(base(reviewFor(onePerClub(n)), { dailyDays: 0 })).puzzles

  it('needs at least three clubs', () => {
    expect(planDaily(published(2), [], TODAY, 7, 'v').entries).toEqual([])
    expect(planDaily(published(3), [], TODAY, 7, 'v').entries).toHaveLength(7)
  })

  it('adds only future dates, three different clubs a day, and spreads the clubs out', () => {
    const puzzles = published(8)
    const { entries } = planDaily(puzzles, [], TODAY, 14, 'v')
    expect(entries[0].dateUtc).toBe('2026-10-21')
    expect(entries).toHaveLength(14)
    const clubOf = (ref: { id: string }) => puzzles.find((p) => p.id === ref.id)!.clubId
    entries.forEach((entry, i) => {
      const clubIds = entry.puzzleRefs.map(clubOf)
      expect(new Set(clubIds).size).toBe(3)
      if (i > 0) {
        const previous = new Set(entries[i - 1].puzzleRefs.map(clubOf))
        expect(clubIds.filter((c) => previous.has(c))).toEqual([]) // 8 clubs: no club twice in a row
      }
    })
  })

  it('never touches entries that were already released and continues after the last one', () => {
    const puzzles = published(6)
    const first = planDaily(puzzles, [], TODAY, 5, 'v').entries
    const next = planDaily(puzzles, first, TODAY, 3, 'v')
    expect(next.entries.slice(0, 5)).toEqual(first)
    expect(next.added).toEqual(['2026-10-26', '2026-10-27', '2026-10-28'])
  })

  it('produces a schedule the validator accepts', () => {
    const plan = planPromotion(base(reviewFor(onePerClub(6)), { dailyDays: 10 }))
    expect(plan.newDailyDates).toHaveLength(10)
    expect(validate(plan).filter((i) => i.severity === 'error')).toEqual([])
  })
})
