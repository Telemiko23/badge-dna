/**
 * Stage C: turn puzzles the OWNER approved in the review screen into published content.
 * Pure planning only (no file access), so it can be tested; scripts/promote.ts does the I/O.
 *
 * Rules enforced here:
 * - only decisions marked "approved" count, and only when the puzzle still has exactly the crest and
 *   reveal order it had when it was approved (signature check);
 * - pieces the source flagged as incomplete are never promoted;
 * - a published puzzle revision never changes: a different order needs a new revision;
 * - review flags (fidelity / visual / reviewer / date) are copied from the owner's decision, never invented;
 * - the daily schedule only ever gets NEW dates after today and after the last released date.
 */
import { addDays } from '../src/domain/dates.ts'
import { mulberry32 } from '../src/domain/practice.ts'
import {
  parseRawContent,
  type CrestVersion,
  type DailyChallenge,
  type Element,
  type Puzzle,
} from '../src/content/schemas.ts'
import { puzzleKey, puzzleSignature, type ReviewFile } from '../src/review/schema.ts'

export interface RightsBasis {
  decidedBy: string
  decidedAt: string
  text: string
}

export interface PublishedSet {
  crests: CrestVersion[]
  elements: Element[]
  puzzles: Puzzle[]
  daily: DailyChallenge[]
}

export interface PlanInput {
  candidate: { crests: unknown[]; elements: unknown[]; puzzles: unknown[] }
  existing: PublishedSet
  review: ReviewFile
  rights: RightsBasis
  today: string
  contentVersion: string
  /** How many new days to add to the daily schedule (0 = none). */
  dailyDays: number
}

export interface Plan extends PublishedSet {
  newPuzzleKeys: string[]
  /** [file name in content/candidates/assets, file name in public/assets] */
  assetCopies: [string, string][]
  skipped: { key: string; reason: string }[]
  warnings: string[]
  newDailyDates: string[]
}

const fileName = (assetPath: string) => assetPath.split('/').pop()!

export function planPromotion(input: PlanInput): Plan {
  const { review, rights, existing, today } = input
  const { content: candidate, issues } = parseRawContent({
    contentVersion: input.contentVersion,
    clubs: [],
    crests: input.candidate.crests,
    elements: input.candidate.elements,
    puzzles: input.candidate.puzzles,
    daily: [],
    competitions: [],
  })
  if (issues.length > 0) throw new Error(`candidate content is invalid: ${issues[0].collection}[${issues[0].index}] ${issues[0].message}`)

  const candidatePuzzles = new Map(candidate.puzzles.map((p) => [puzzleKey(p), p]))
  const candidateCrests = new Map(candidate.crests.map((c) => [c.id, c]))
  const candidateElements = new Map(candidate.elements.map((e) => [e.id, e]))

  const crests = new Map(existing.crests.map((c) => [c.id, c]))
  const elements = new Map(existing.elements.map((e) => [e.id, e]))
  const puzzles = new Map(existing.puzzles.map((p) => [puzzleKey(p), p]))

  const skipped: Plan['skipped'] = []
  const warnings: string[] = []
  const newPuzzleKeys: string[] = []
  const assetCopies = new Map<string, string>()
  const evidence = `${rights.text} (${rights.decidedBy}, ${rights.decidedAt})`

  for (const [key, decision] of Object.entries(review.puzzles)) {
    if (decision.decision !== 'approved') continue
    const draft = candidatePuzzles.get(key)
    if (!draft) {
      skipped.push({ key, reason: 'the puzzle no longer exists in the candidate drafts' })
      continue
    }
    if (decision.signature !== puzzleSignature(draft)) {
      skipped.push({ key, reason: 'the puzzle changed after it was approved: review it again' })
      continue
    }
    const crest = candidateCrests.get(draft.crestVersionId)
    const pieces = draft.revealOrder.map((id) => candidateElements.get(id))
    if (!crest || pieces.some((p) => !p)) {
      skipped.push({ key, reason: 'its crest or a piece is missing' })
      continue
    }
    if (pieces.some((p) => p!.autoSelectable === false)) {
      skipped.push({ key, reason: 'it uses a piece its source flagged as incomplete' })
      continue
    }

    const previous = puzzles.get(key)
    if (previous) {
      if (previous.crestVersionId !== draft.crestVersionId || previous.revealOrder.join() !== draft.revealOrder.join()) {
        skipped.push({ key, reason: 'already published with a different order: a published revision cannot change, add a new revision' })
      }
      continue // already published and identical: nothing to do
    }

    puzzles.set(key, {
      ...draft,
      status: 'published',
      audience: 'premier-league-2026-27',
      reviewedBy: review.reviewer,
      reviewedAt: decision.decidedAt,
      editorialNotes: decision.note ? `${draft.editorialNotes} | ${decision.note}` : draft.editorialNotes,
    })
    newPuzzleKeys.push(key)

    if (!crests.has(crest.id)) {
      crests.set(crest.id, {
        ...crest,
        fullAssetPath: `assets/${fileName(crest.fullAssetPath)}`,
        rightsStatus: 'approved_for_project',
        rightsEvidence: evidence,
        fidelityReviewed: true,
      })
      assetCopies.set(fileName(crest.fullAssetPath), fileName(crest.fullAssetPath))
    }
    for (const piece of pieces as Element[]) {
      if (elements.has(piece.id)) continue
      elements.set(piece.id, {
        ...piece,
        assetPath: `assets/${fileName(piece.assetPath)}`,
        fidelityReviewed: true,
        visualReviewed: true,
      })
      assetCopies.set(fileName(piece.assetPath), fileName(piece.assetPath))
    }
  }

  // A published puzzle whose approval was later withdrawn is NOT silently unpublished.
  for (const [key, puzzle] of puzzles) {
    if (puzzle.status === 'published' && review.puzzles[key]?.decision !== 'approved') {
      warnings.push(`${key} is published but its review decision is no longer "approved"; retire it by hand if that was intended`)
    }
  }

  const published = [...puzzles.values()].filter((p) => p.status === 'published')
  const daily = planDaily(published, existing.daily, today, input.dailyDays, input.contentVersion)

  return {
    crests: [...crests.values()],
    elements: [...elements.values()],
    puzzles: [...puzzles.values()],
    daily: daily.entries,
    newDailyDates: daily.added,
    newPuzzleKeys,
    assetCopies: [...assetCopies.entries()],
    skipped,
    warnings,
  }
}

/**
 * Adds explicit, dated daily entries after the last released date (never before tomorrow). Each day uses
 * three different clubs, preferring clubs that were used least recently, so the same club does not
 * return on consecutive days whenever there are enough clubs. Existing entries are never touched.
 */
export function planDaily(
  published: readonly Puzzle[],
  existing: readonly DailyChallenge[],
  today: string,
  days: number,
  contentVersion: string,
): { entries: DailyChallenge[]; added: string[] } {
  const entries = [...existing]
  const clubIds = [...new Set(published.map((p) => p.clubId))].sort()
  if (days <= 0 || clubIds.length < 3) return { entries, added: [] }

  const byId = new Map(published.map((p) => [p.id + '@' + p.revision, p]))
  const sortedExisting = [...existing].sort((a, b) => a.dateUtc.localeCompare(b.dateUtc))
  const lastReleased = sortedExisting.at(-1)?.dateUtc
  const tomorrow = addDays(today, 1)
  const start = lastReleased && addDays(lastReleased, 1) > tomorrow ? addDays(lastReleased, 1) : tomorrow

  const lastUsed = new Map<string, number>() // club -> day index
  const uses = new Map<string, number>() // puzzle key -> times used
  sortedExisting.forEach((entry, index) => {
    for (const ref of entry.puzzleRefs) {
      const p = byId.get(ref.id + '@' + ref.revision)
      if (p) {
        lastUsed.set(p.clubId, index - sortedExisting.length)
        uses.set(ref.id + '@' + ref.revision, (uses.get(ref.id + '@' + ref.revision) ?? 0) + 1)
      }
    }
  })

  const added: string[] = []
  for (let i = 0; i < days; i++) {
    const dateUtc = addDays(start, i)
    const rand = mulberry32(i + 1 + sortedExisting.length * 7919)
    const order = [...clubIds].sort(
      (a, b) => (lastUsed.get(a) ?? -1e9) - (lastUsed.get(b) ?? -1e9) || rand() - 0.5,
    )
    const chosenClubs = order.slice(0, 3)
    const refs = chosenClubs.map((clubId) => {
      const options = published
        .filter((p) => p.clubId === clubId)
        .sort((a, b) => (uses.get(a.id + '@' + a.revision) ?? 0) - (uses.get(b.id + '@' + b.revision) ?? 0) || a.id.localeCompare(b.id))
      const pick = options[0]
      uses.set(pick.id + '@' + pick.revision, (uses.get(pick.id + '@' + pick.revision) ?? 0) + 1)
      lastUsed.set(clubId, i)
      return { id: pick.id, revision: pick.revision }
    })
    entries.push({ id: `d_${dateUtc}`, dateUtc, puzzleRefs: refs, contentVersion, scoringVersion: 'scoring-v1' })
    added.push(dateUtc)
  }
  return { entries, added }
}
