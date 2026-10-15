import { describe, expect, it } from 'vitest'
import { EMPTY_REVIEW, ReviewFileSchema, puzzleKey, puzzleSignature, reviewCounts, type ReviewFile } from '../src/review/schema.ts'

const all = { crestMatchesSource: true, piecesFaithfulAndReadable: true, orderAcceptable: true }
const decision = (d: 'approved' | 'changes' | 'rejected', confirmations = all) => ({
  decision: d,
  note: '',
  decidedAt: '2026-10-15T12:00:00.000Z',
  signature: 'c|a,b,c',
  confirmations,
})

describe('review decisions', () => {
  it('accepts an approval only with all three confirmations and a reviewer name', () => {
    const ok: ReviewFile = { ...EMPTY_REVIEW, reviewer: 'Owner', puzzles: { 'p@1': decision('approved') } }
    expect(ReviewFileSchema.safeParse(ok).success).toBe(true)

    const partial = { ...ok, puzzles: { 'p@1': decision('approved', { ...all, orderAcceptable: false }) } }
    expect(ReviewFileSchema.safeParse(partial).success).toBe(false)

    const noName = { ...ok, reviewer: '  ' }
    expect(ReviewFileSchema.safeParse(noName).success).toBe(false)
  })

  it('lets "needs changes" and "rejected" be recorded without confirmations or a name', () => {
    const none = { crestMatchesSource: false, piecesFaithfulAndReadable: false, orderAcceptable: false }
    const file = { ...EMPTY_REVIEW, puzzles: { 'a@1': decision('changes', none), 'b@1': decision('rejected', none) } }
    expect(ReviewFileSchema.safeParse(file).success).toBe(true)
  })

  it('rejects unknown fields and wrong versions', () => {
    expect(ReviewFileSchema.safeParse({ ...EMPTY_REVIEW, extra: 1 }).success).toBe(false)
    expect(ReviewFileSchema.safeParse({ ...EMPTY_REVIEW, schemaVersion: 2 }).success).toBe(false)
  })

  it('counts decisions per puzzle key', () => {
    const file: ReviewFile = {
      ...EMPTY_REVIEW,
      reviewer: 'Owner',
      puzzles: { 'a@1': decision('approved'), 'b@1': decision('changes'), 'c@1': decision('rejected') },
    }
    expect(reviewCounts(file, ['a@1', 'b@1', 'c@1', 'd@1', 'e@1'])).toEqual({ approved: 1, changes: 1, rejected: 1, pending: 2 })
    expect(puzzleKey({ id: 'pz_1', revision: 3 })).toBe('pz_1@3')
    expect(puzzleSignature({ crestVersionId: 'c_1', revealOrder: ['e_1', 'e_2'] })).toBe('c_1|e_1,e_2')
  })
})
