import { z } from 'zod'

/**
 * The owner's review decisions (stage B). Stored in content/reviews/review.json.
 * A decision is made by a person: "approved" is only valid when all three confirmations
 * were ticked, and a reviewer name is on the file. Nothing here is ever set automatically.
 */
export const ConfirmationsSchema = z.strictObject({
  crestMatchesSource: z.boolean(),
  piecesFaithfulAndReadable: z.boolean(),
  orderAcceptable: z.boolean(),
})

export const ReviewDecisionSchema = z
  .strictObject({
    decision: z.enum(['approved', 'changes', 'rejected']),
    note: z.string().max(2000),
    decidedAt: z.string(),
    confirmations: ConfirmationsSchema,
  })
  .refine(
    (d) =>
      d.decision !== 'approved' ||
      (d.confirmations.crestMatchesSource && d.confirmations.piecesFaithfulAndReadable && d.confirmations.orderAcceptable),
    { message: 'approval requires all three confirmations' },
  )

export const ReviewFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    reviewer: z.string().max(120),
    /** keyed by "<puzzle id>@<revision>" */
    puzzles: z.record(z.string(), ReviewDecisionSchema),
  })
  .refine((f) => !Object.values(f.puzzles).some((d) => d.decision === 'approved') || f.reviewer.trim().length > 0, {
    message: 'approvals need a reviewer name',
  })

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>
export type ReviewFile = z.infer<typeof ReviewFileSchema>

export const EMPTY_REVIEW: ReviewFile = { schemaVersion: 1, reviewer: '', puzzles: {} }

export const puzzleKey = (ref: { id: string; revision: number }) => `${ref.id}@${ref.revision}`

export function reviewCounts(file: ReviewFile, keys: readonly string[]) {
  const counts = { approved: 0, changes: 0, rejected: 0, pending: 0 }
  for (const key of keys) {
    const d = file.puzzles[key]
    if (!d) counts.pending++
    else counts[d.decision]++
  }
  return counts
}
