import { z } from 'zod'

/**
 * Content contract (spec §12). Types are inferred from these schemas.
 * "internal" fields must never be rendered in an active round.
 */

const Id = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, 'ids are lowercase letters, digits, - or _')
const LocalizedName = z.strictObject({ he: z.string().min(1), en: z.string().min(1) })

export const ClubSchema = z.strictObject({
  id: Id,
  displayName: LocalizedName,
  aliases: z.array(z.string().min(1)),
  countryCode: z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2'),
  city: LocalizedName.optional(),
  active: z.boolean(),
})

export const RightsStatus = z.enum(['unknown', 'review_required', 'approved_for_project'])

export const CrestVersionSchema = z.strictObject({
  id: Id,
  clubId: Id,
  variantLabel: z.string().min(1),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  fullAssetPath: z.string().min(1),
  sourceUrl: z.string().min(1),
  retrievedAt: z.string().min(1),
  sourceSha256: z.string().min(1),
  rightsStatus: RightsStatus,
  rightsEvidence: z.string().nullable(),
  attributionText: z.string().nullable(),
  fidelityReviewed: z.boolean(),
})

export const ElementSchema = z.strictObject({
  id: Id,
  crestVersionId: Id,
  semanticType: z.string().min(1),
  internalLabel: z.string().min(1),
  assetPath: z.string().min(1),
  pixelWidth: z.number().int().positive(),
  pixelHeight: z.number().int().positive(),
  parentElementId: Id.nullable(),
  containsText: z.boolean(),
  fidelityReviewed: z.boolean(),
  visualReviewed: z.boolean(),
  extractionMethod: z.enum(['vector', 'raster_mask', 'manual']),
  sourceMapping: z.record(z.string(), z.unknown()).optional(),
  /** Backdrop tone for the clue tile: light artwork sits on a dark tile, dark artwork on a light one. */
  tileTone: z.enum(['light', 'mid', 'dark']).optional(),
  /** For single-letter pieces: the letter shown. It must not be the first letter of the club's name. */
  letter: z.string().length(1).optional(),
  /** false = the source flagged this piece as incomplete; it must not be used as a clue until fixed. */
  autoSelectable: z.boolean().optional(),
})

export const PuzzleStatus = z.enum(['draft', 'review', 'published', 'retired'])

export const PuzzleSchema = z.strictObject({
  id: Id,
  revision: z.number().int().min(1),
  clubId: Id,
  crestVersionId: Id,
  revealOrder: z.array(Id).min(3).max(5),
  status: PuzzleStatus,
  audience: z.string().min(1),
  familiarity: z.enum(['uncalibrated', 'familiar', 'specialist']),
  difficultyStatus: z.enum(['uncalibrated', 'tested']),
  editorialNotes: z.string(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  scoringVersion: z.string().min(1),
})

/** A grouping of clubs for browsing/progression: a league season, a cup, a national-team set. */
export const CompetitionSchema = z.strictObject({
  id: Id,
  kind: z.enum(['league', 'cup', 'national']),
  season: z.string().nullable(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  name: LocalizedName,
  clubIds: z.array(Id).min(1),
  sourceNote: z.string(),
})

export const DailyChallengeSchema = z.strictObject({
  id: Id,
  dateUtc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  puzzleRefs: z
    .array(z.strictObject({ id: Id, revision: z.number().int().min(1) }))
    .length(3),
  contentVersion: z.string().min(1),
  scoringVersion: z.string().min(1),
})

export type Club = z.infer<typeof ClubSchema>
export type CrestVersion = z.infer<typeof CrestVersionSchema>
export type Element = z.infer<typeof ElementSchema>
export type Puzzle = z.infer<typeof PuzzleSchema>
export type DailyChallenge = z.infer<typeof DailyChallengeSchema>
export type Competition = z.infer<typeof CompetitionSchema>

/** Raw, not yet validated content as read from the JSON files. */
export interface RawContent {
  contentVersion: string
  clubs: unknown[]
  crests: unknown[]
  elements: unknown[]
  puzzles: unknown[]
  daily: unknown[]
  competitions: unknown[]
}

export interface ParsedContent {
  contentVersion: string
  clubs: Club[]
  crests: CrestVersion[]
  elements: Element[]
  puzzles: Puzzle[]
  daily: DailyChallenge[]
  competitions: Competition[]
}

export interface SchemaIssue {
  collection: string
  index: number
  message: string
}

/** Parse every collection; returns all schema problems instead of stopping at the first. */
export function parseRawContent(raw: RawContent): { content: ParsedContent; issues: SchemaIssue[] } {
  const issues: SchemaIssue[] = []
  function parseAll<T>(collection: string, schema: z.ZodType<T>, items: unknown[]): T[] {
    const out: T[] = []
    items.forEach((item, index) => {
      const result = schema.safeParse(item)
      if (result.success) {
        out.push(result.data)
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            collection,
            index,
            message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          })
        }
      }
    })
    return out
  }
  return {
    issues,
    content: {
      contentVersion: raw.contentVersion,
      clubs: parseAll('clubs', ClubSchema, raw.clubs),
      crests: parseAll('crests', CrestVersionSchema, raw.crests),
      elements: parseAll('elements', ElementSchema, raw.elements),
      puzzles: parseAll('puzzles', PuzzleSchema, raw.puzzles),
      daily: parseAll('daily', DailyChallengeSchema, raw.daily),
      competitions: parseAll('competitions', CompetitionSchema, raw.competitions),
    },
  }
}
