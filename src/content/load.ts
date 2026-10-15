import type { Club, RawContent } from './schemas.ts'
import { buildRepository, type ContentRepository } from './repository.ts'
import { nowMs } from '../clock.ts'
import { gameDateUtc } from '../domain/dates.ts'
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
  fixture: ContentRepository | null
}

export async function loadContent(): Promise<ContentBundle> {
  const real = buildRepository('real', realRawContent(), resolveRealAsset)
  let fixture: ContentRepository | null = null
  if (__INCLUDE_FIXTURES__) {
    const { fixtureRaw, fixtureAssetUrls, fixtureDailySchedule } = await import('./fixtures.ts')
    const daily = fixtureDailySchedule(gameDateUtc(nowMs()))
    fixture = buildRepository('fixture', { ...fixtureRaw, daily }, (path) => fixtureAssetUrls[path] ?? '')
  }
  return { real, fixture }
}

export interface ActiveContent {
  /** `real`: published real puzzles. `fixture`: dev-only synthetic puzzles. `empty`: nothing playable. */
  mode: 'real' | 'fixture' | 'empty'
  repo: ContentRepository
  /** Clubs offered by the guess search (real clubs, plus fixture clubs in fixture mode). */
  searchClubs: Club[]
  searchIndex: SearchIndex
}

export function selectActiveContent(bundle: ContentBundle): ActiveContent {
  const hasReal = bundle.real.publishedPuzzles().length > 0
  const useFixture = !hasReal && bundle.fixture !== null && bundle.fixture.publishedPuzzles().length > 0
  const repo = useFixture ? bundle.fixture! : bundle.real
  const searchClubs = useFixture ? [...bundle.real.clubs, ...bundle.fixture!.clubs] : [...bundle.real.clubs]
  return {
    mode: hasReal ? 'real' : useFixture ? 'fixture' : 'empty',
    repo,
    searchClubs,
    searchIndex: buildSearchIndex(searchClubs),
  }
}
