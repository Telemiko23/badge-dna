import type { PuzzleRef } from '../domain/practice.ts'
import {
  parseRawContent,
  type Club,
  type CrestVersion,
  type DailyChallenge,
  type Element,
  type ParsedContent,
  type Puzzle,
  type RawContent,
} from './schemas.ts'

export type ContentKind = 'real' | 'fixture'

export class ContentError extends Error {
  details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'ContentError'
    this.details = details
  }
}

export interface PlayableElement {
  id: string
  url: string
  width: number
  height: number
}

/** Everything the round UI needs. The answer club id lives here, never in the DOM. */
export interface PlayablePuzzle {
  ref: PuzzleRef
  clubId: string
  contentVersion: string
  scoringVersion: string
  totalReveals: number
  elements: PlayableElement[]
  crestUrl: string
}

export interface ContentRepository {
  kind: ContentKind
  contentVersion: string
  clubs: readonly Club[]
  publishedPuzzles(): Puzzle[]
  dailyChallenges(): DailyChallenge[]
  /**
   * The scheduled challenge for a game date, only if it is playable: exactly three
   * published, loadable puzzles of three different clubs. Otherwise null; the app
   * then says the daily challenge isn't available rather than inventing a day.
   */
  getValidDaily(dateUtc: string): DailyChallenge | null
  getClub(id: string): Club | undefined
  getPuzzle(ref: PuzzleRef): Puzzle | undefined
  /** Null when the referenced puzzle revision or one of its pieces is missing. */
  getPlayablePuzzle(ref: PuzzleRef): PlayablePuzzle | null
}

export function buildRepository(
  kind: ContentKind,
  raw: RawContent,
  resolveAsset: (assetPath: string) => string,
): ContentRepository {
  const { content, issues } = parseRawContent(raw)
  if (issues.length > 0) {
    throw new ContentError(
      `Content (${kind}) failed schema validation`,
      issues.slice(0, 20).map((i) => `${i.collection}[${i.index}] ${i.message}`),
    )
  }
  return createRepository(kind, content, resolveAsset)
}

function createRepository(
  kind: ContentKind,
  content: ParsedContent,
  resolveAsset: (assetPath: string) => string,
): ContentRepository {
  const clubs = new Map(content.clubs.map((c) => [c.id, c]))
  const crests = new Map<string, CrestVersion>(content.crests.map((c) => [c.id, c]))
  const elements = new Map<string, Element>(content.elements.map((e) => [e.id, e]))
  const puzzles = new Map(content.puzzles.map((p) => [`${p.id}@${p.revision}`, p]))

  function getPlayable(ref: PuzzleRef): PlayablePuzzle | null {
    const puzzle = puzzles.get(`${ref.id}@${ref.revision}`)
    const crest = puzzle && crests.get(puzzle.crestVersionId)
    if (!puzzle || !crest) return null
    const playable: PlayableElement[] = []
    for (const id of puzzle.revealOrder) {
      const element = elements.get(id)
      if (!element) return null
      playable.push({
        id: element.id,
        url: resolveAsset(element.assetPath),
        width: element.pixelWidth,
        height: element.pixelHeight,
      })
    }
    return {
      ref: { id: puzzle.id, revision: puzzle.revision },
      clubId: puzzle.clubId,
      contentVersion: content.contentVersion,
      scoringVersion: puzzle.scoringVersion,
      totalReveals: playable.length,
      elements: playable,
      crestUrl: resolveAsset(crest.fullAssetPath),
    }
  }

  return {
    kind,
    contentVersion: content.contentVersion,
    clubs: content.clubs,
    publishedPuzzles: () => content.puzzles.filter((p) => p.status === 'published'),
    dailyChallenges: () => content.daily,
    getValidDaily(dateUtc) {
      const entry = content.daily.find((d) => d.dateUtc === dateUtc)
      if (!entry) return null
      const puzzlesOfDay = entry.puzzleRefs.map((ref) => puzzles.get(`${ref.id}@${ref.revision}`))
      const playable = entry.puzzleRefs.every((ref, i) => {
        const puzzle = puzzlesOfDay[i]
        return puzzle?.status === 'published' && getPlayable(ref) !== null
      })
      const clubIds = new Set(puzzlesOfDay.map((p) => p?.clubId))
      return playable && clubIds.size === entry.puzzleRefs.length ? entry : null
    },
    getClub: (id) => clubs.get(id),
    getPuzzle: (ref) => puzzles.get(`${ref.id}@${ref.revision}`),
    getPlayablePuzzle: getPlayable,
  }
}
