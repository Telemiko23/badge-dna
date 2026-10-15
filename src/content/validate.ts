import { GAME_CONFIG } from '../domain/config.ts'
import { addDays, isValidDateUtc } from '../domain/dates.ts'
import { parseRawContent, type ParsedContent, type RawContent } from './schemas.ts'

export interface ValidationIssue {
  severity: 'error' | 'warning'
  code: string
  message: string
}

export interface ValidateOptions {
  /** fixtures are synthetic: human-review and rights gates do not apply. */
  kind: 'real' | 'fixture'
  assetExists: (assetPath: string) => boolean
}

function dupes(ids: string[]): string[] {
  const seen = new Set<string>()
  const out = new Set<string>()
  for (const id of ids) (seen.has(id) ? out : seen).add(id)
  return [...out]
}

/** Slug tokens that would leak the answer if they appeared in an asset path. */
function leakTokens(club: ParsedContent['clubs'][number]): string[] {
  const words = club.displayName.en.toLowerCase().split(/[^a-z0-9]+/)
  return [club.id, ...words].filter((w) => w.length >= 4)
}

/**
 * Mechanical content checks (spec §18.2). This does NOT replace the human review
 * of element meaning and fidelity; it only enforces that the review was recorded.
 */
export function validateContent(raw: RawContent, options: ValidateOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (code: string, message: string) => issues.push({ severity: 'error', code, message })
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, message })

  const { content, issues: schemaIssues } = parseRawContent(raw)
  for (const s of schemaIssues) error('schema', `${s.collection}[${s.index}] ${s.message}`)
  if (schemaIssues.length > 0) return issues // references below need valid shapes

  for (const id of dupes(content.clubs.map((c) => c.id))) error('duplicate-id', `club ${id}`)
  for (const id of dupes(content.crests.map((c) => c.id))) error('duplicate-id', `crest ${id}`)
  for (const id of dupes(content.elements.map((e) => e.id))) error('duplicate-id', `element ${id}`)
  for (const key of dupes(content.puzzles.map((p) => `${p.id}@${p.revision}`))) {
    error('duplicate-id', `puzzle ${key}`)
  }
  for (const id of dupes(content.daily.map((d) => d.id))) error('duplicate-id', `daily ${id}`)
  for (const date of dupes(content.daily.map((d) => d.dateUtc))) {
    error('duplicate-date', `two daily challenges for ${date}`)
  }

  const clubs = new Map(content.clubs.map((c) => [c.id, c]))
  const crests = new Map(content.crests.map((c) => [c.id, c]))
  const elements = new Map(content.elements.map((e) => [e.id, e]))
  const puzzles = new Map(content.puzzles.map((p) => [`${p.id}@${p.revision}`, p]))

  for (const id of dupes(content.competitions.map((c) => c.id))) error('duplicate-id', `competition ${id}`)
  for (const competition of content.competitions) {
    for (const clubId of competition.clubIds) {
      if (!clubs.has(clubId)) error('missing-ref', `competition ${competition.id} -> club ${clubId}`)
    }
    if (new Set(competition.clubIds).size !== competition.clubIds.length) {
      error('competition-duplicate', `competition ${competition.id} lists a club twice`)
    }
  }

  for (const club of content.clubs) {
    const names = [club.displayName.he, club.displayName.en, ...club.aliases].map((n) => n.trim())
    if (names.some((n) => n.length === 0)) error('club-name', `club ${club.id} has an empty name`)
  }

  for (const crest of content.crests) {
    if (!clubs.has(crest.clubId)) error('missing-ref', `crest ${crest.id} -> club ${crest.clubId}`)
    if (!options.assetExists(crest.fullAssetPath)) {
      error('missing-asset', `crest ${crest.id}: ${crest.fullAssetPath}`)
    }
  }

  for (const element of content.elements) {
    const crest = crests.get(element.crestVersionId)
    if (!crest) error('missing-ref', `element ${element.id} -> crest ${element.crestVersionId}`)
    if (!options.assetExists(element.assetPath)) {
      error('missing-asset', `element ${element.id}: ${element.assetPath}`)
    }
    if (element.parentElementId) {
      const parent = elements.get(element.parentElementId)
      if (!parent) error('missing-ref', `element ${element.id} -> parent ${element.parentElementId}`)
      else if (parent.crestVersionId !== element.crestVersionId) {
        error('crest-mismatch', `element ${element.id} and its parent come from different crests`)
      }
    }
    const club = crest ? clubs.get(crest.clubId) : undefined
    if (club) {
      const path = element.assetPath.toLowerCase()
      for (const token of leakTokens(club)) {
        if (path.includes(token)) {
          error('asset-leak', `element ${element.id}: asset path contains "${token}"; use a neutral id`)
        }
      }
    }
  }

  for (const puzzle of content.puzzles) {
    const label = `puzzle ${puzzle.id}@${puzzle.revision}`
    const club = clubs.get(puzzle.clubId)
    const crest = crests.get(puzzle.crestVersionId)
    if (!club) error('missing-ref', `${label} -> club ${puzzle.clubId}`)
    if (!crest) error('missing-ref', `${label} -> crest ${puzzle.crestVersionId}`)
    else if (crest.clubId !== puzzle.clubId) {
      error('crest-mismatch', `${label}: crest belongs to another club`)
    }
    if (puzzle.scoringVersion !== GAME_CONFIG.scoringVersion) {
      error('scoring-version', `${label}: unsupported ${puzzle.scoringVersion}`)
    }
    if (new Set(puzzle.revealOrder).size !== puzzle.revealOrder.length) {
      error('reveal-duplicate', `${label}: revealOrder repeats an element`)
    }
    const paths = new Set<string>()
    for (const id of puzzle.revealOrder) {
      const element = elements.get(id)
      if (!element) {
        error('missing-ref', `${label} -> element ${id}`)
        continue
      }
      if (element.crestVersionId !== puzzle.crestVersionId) {
        error('crest-mismatch', `${label}: element ${id} comes from a different crest version`)
      }
      if (element.letter && club && element.letter.toUpperCase() === club.displayName.en.trim()[0]?.toUpperCase()) {
        error('letter-is-initial', `${label}: letter ${element.letter} is the first letter of the club's name`)
      }
      if (element.autoSelectable === false) {
        error('element-not-selectable', `${label}: element ${id} is flagged as incomplete in its source and cannot be a clue`)
      }
      if (paths.has(element.assetPath)) {
        error('reveal-duplicate', `${label}: two reveals use the same asset`)
      }
      paths.add(element.assetPath)
    }

    if (puzzle.status === 'published' && options.kind === 'real') {
      if (!crest || crest.rightsStatus !== 'approved_for_project') {
        error('publish-gate', `${label}: crest rightsStatus must be approved_for_project`)
      }
      if (!crest?.fidelityReviewed) error('publish-gate', `${label}: crest not fidelity-reviewed`)
      for (const id of puzzle.revealOrder) {
        const e = elements.get(id)
        if (e && !e.fidelityReviewed) error('publish-gate', `${label}: element ${id} not fidelity-reviewed`)
        if (e && !e.visualReviewed) error('publish-gate', `${label}: element ${id} not visually reviewed`)
      }
      if (!puzzle.reviewedBy || !puzzle.reviewedAt) {
        error('publish-gate', `${label}: reviewedBy/reviewedAt missing`)
      }
    }
    if (puzzle.status === 'draft' && puzzle.reviewedBy) {
      warn('review-trail', `${label}: draft with reviewedBy set`)
    }
  }

  const dailyPuzzleClubs = (d: ParsedContent['daily'][number]) =>
    d.puzzleRefs.map((r) => puzzles.get(`${r.id}@${r.revision}`)?.clubId)
  for (const d of content.daily) {
    for (const ref of d.puzzleRefs) {
      const puzzle = puzzles.get(`${ref.id}@${ref.revision}`)
      if (!puzzle) error('missing-ref', `daily ${d.id} -> puzzle ${ref.id}@${ref.revision}`)
      else if (puzzle.status !== 'published') {
        error('daily-unpublished', `daily ${d.id}: ${ref.id}@${ref.revision} is ${puzzle.status}`)
      }
    }
    const clubIds = dailyPuzzleClubs(d).filter(Boolean)
    if (new Set(clubIds).size !== clubIds.length) {
      error('daily-duplicate-club', `daily ${d.id}: the same club appears twice`)
    }
    if (d.scoringVersion !== GAME_CONFIG.scoringVersion) {
      error('scoring-version', `daily ${d.id}: unsupported ${d.scoringVersion}`)
    }
  }

  for (const d of content.daily) {
    if (!isValidDateUtc(d.dateUtc)) error('bad-date', `daily ${d.id}: ${d.dateUtc} is not a calendar date`)
  }
  // Same club on consecutive days is discouraged (spec §11), so it is a warning.
  const byDate = new Map(content.daily.map((d) => [d.dateUtc, d]))
  for (const d of content.daily) {
    if (!isValidDateUtc(d.dateUtc)) continue
    const previous = byDate.get(addDays(d.dateUtc, -1))
    if (!previous) continue
    const clubsToday = new Set(dailyPuzzleClubs(d))
    const repeated = dailyPuzzleClubs(previous).filter((c) => c && clubsToday.has(c))
    if (repeated.length > 0) {
      warn('daily-consecutive-club', `${previous.dateUtc} and ${d.dateUtc} share ${[...new Set(repeated)].join(', ')}`)
    }
  }

  return issues
}
