/**
 * Synthetic test puzzles (invented clubs, invented crests). Loaded only through a
 * dynamic import guarded by `__INCLUDE_FIXTURES__`, so production builds contain
 * neither this module nor the fixture assets. See docs/content-guide.md.
 */
import type { RawContent } from './schemas.ts'

function collect(modules: Record<string, unknown>): unknown[] {
  return Object.keys(modules)
    .sort()
    .flatMap((key) => {
      const value = modules[key]
      return Array.isArray(value) ? value : [value]
    })
}

const clubs = import.meta.glob('../../content/fixtures/clubs/*.json', { eager: true, import: 'default' })
const crests = import.meta.glob('../../content/fixtures/crests/*.json', { eager: true, import: 'default' })
const elements = import.meta.glob('../../content/fixtures/elements/*.json', { eager: true, import: 'default' })
const puzzles = import.meta.glob('../../content/fixtures/puzzles/*.json', { eager: true, import: 'default' })
const meta = import.meta.glob('../../content/fixtures/meta.json', { eager: true, import: 'default' })
const assetModules = import.meta.glob('../../content/fixtures/assets/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const fixtureRaw: RawContent = {
  contentVersion: String((Object.values(meta)[0] as { contentVersion?: string })?.contentVersion ?? 'fixtures-0'),
  clubs: collect(clubs),
  crests: collect(crests),
  elements: collect(elements),
  puzzles: collect(puzzles),
  daily: [],
}

/** assetPath ("fixtures/<file>.svg") -> served URL */
export const fixtureAssetUrls: Record<string, string> = Object.fromEntries(
  Object.entries(assetModules).map(([path, url]) => [`fixtures/${path.split('/').pop()}`, url as string]),
)
