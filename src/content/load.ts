import type { Club, RawContent } from './schemas.ts'
import { buildRepository, type ContentRepository } from './repository.ts'
import { nowMs } from '../clock.ts'
import { gameDateUtc } from '../domain/dates.ts'
import { devDailySchedule } from './devSchedule.ts'
import { buildSearchIndex, type SearchIndex } from '../domain/search.ts'

function collect(modules: Record<string, unknown>): unknown[] {
  return Object.keys(modules)
    .sort()
    .flatMap((key) => {
      const value = modules[key]
      return Array.isArray(value) ? value : [value]
    })
}

const realClubs = import.meta.glob('../../content/clubs/*.json', { eager: true, import: 'default' })
const realCrests = import.meta.glob('../../content/crests/*.json', { eager: true, import: 'default' })
const realElements = import.meta.glob('../../content/elements/*.json', { eager: true, import: 'default' })
const realPuzzles = import.meta.glob('../../content/puzzles/*.json', { eager: true, import: 'default' })
const realDaily = import.meta.glob('../../content/daily/*.json', { eager: true, import: 'default' })
const realCompetitions = import.meta.glob('../../content/competitions/*.json', { eager: true, import: 'default' })
const realMeta = import.meta.glob('../../content/meta.json', { eager: true, import: 'default' })

export function realRawContent(): RawContent {
  const meta = Object.values(realMeta)[0] as { contentVersion?: string } | undefined
  return {
    contentVersion: meta?.contentVersion ?? 'unversioned',
    clubs: collect(realClubs),
    crests: collect(realCrests),
    elements: collect(realElements),
    puzzles: collect(realPuzzles),
    daily: collect(realDaily),
    competitions: collect(realCompetitions),
  }
}

/** Real assets are neutral-id files under public/assets/. */
function resolveRealAsset(assetPath: string): string {
  return `${import.meta.env.BASE_URL}${assetPath}`
}

export interface ContentBundle {
  real: ContentRepository
  /** Real crests still in draft; development builds only, and only when the local assets exist. */
  candidate: ContentRepository | null
  fixture: ContentRepository | null
  /** Dev-only `?content=real|candidate|fixture` override. */
  forced: ActiveContent['mode'] | null
}

export async function loadContent(): Promise<ContentBundle> {
  const real = buildRepository('real', realRawContent(), resolveRealAsset)
  let fixture: ContentRepository | null = null
  let candidate: ContentRepository | null = null
  let forced: ContentBundle['forced'] = null
  if (__INCLUDE_FIXTURES__) {
    const today = gameDateUtc(nowMs())
    const { fixtureRaw, fixtureAssetUrls, fixtureDailySchedule } = await import('./fixtures.ts')
    fixture = buildRepository(
      'fixture',
      { ...fixtureRaw, daily: fixtureDailySchedule(today) },
      (path) => fixtureAssetUrls[path] ?? '',
    )

    const { candidateRaw, candidateAssetUrls } = await import('./candidates.ts')
    if (Object.keys(candidateAssetUrls).length > 0 && candidateRaw.puzzles.length > 0) {
      const base = realRawContent()
      const puzzles = candidateRaw.puzzles as { id: string; revision: number; clubId: string }[]
      const raw: RawContent = {
        ...candidateRaw,
        clubs: base.clubs,
        daily: devDailySchedule(puzzles, today, candidateRaw.contentVersion),
        competitions: [],
      }
      candidate = buildRepository('candidate', raw, (path) => candidateAssetUrls[path] ?? '')
    }
    const wanted = new URLSearchParams(window.location.search).get('content')
    forced = wanted === 'real' || wanted === 'candidate' || wanted === 'fixture' ? wanted : null
  }
  return { real, candidate, fixture, forced }
}

export interface ActiveContent {
  /**
   * `real`: published real puzzles. `candidate`: dev-only drafts of real crests awaiting review.
   * `fixture`: dev-only invented puzzles. `empty`: nothing playable.
   */
  mode: 'real' | 'candidate' | 'fixture' | 'empty'
  repo: ContentRepository
  /** Clubs offered by the guess search (real clubs, plus fixture clubs in fixture mode). */
  searchClubs: Club[]
  searchIndex: SearchIndex
}

export function selectActiveContent(bundle: ContentBundle): ActiveContent {
  const hasReal = bundle.real.publishedPuzzles().length > 0
  const hasCandidate = bundle.candidate !== null && bundle.candidate.playablePuzzles().length > 0
  const hasFixture = bundle.fixture !== null && bundle.fixture.publishedPuzzles().length > 0
  // Order: published real puzzles, then (dev only) real-crest drafts, then invented fixtures.
  const automatic = hasReal ? 'real' : hasCandidate ? 'candidate' : hasFixture ? 'fixture' : 'empty'
  const available = { real: hasReal, candidate: hasCandidate, fixture: hasFixture, empty: true }
  const mode = bundle.forced && available[bundle.forced] ? bundle.forced : automatic
  const repo = mode === 'candidate' ? bundle.candidate! : mode === 'fixture' ? bundle.fixture! : bundle.real
  const searchClubs = mode === 'fixture' ? [...bundle.real.clubs, ...bundle.fixture!.clubs] : [...bundle.real.clubs]
  return { mode, repo, searchClubs, searchIndex: buildSearchIndex(searchClubs) }
}
