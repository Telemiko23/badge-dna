/**
 * CANDIDATE content: real crests imported from an owner-provided package, still DRAFT (rights,
 * fidelity and editorial review are all pending). Loaded only through a dynamic import guarded by
 * `__INCLUDE_FIXTURES__`, so production builds contain neither this module nor the assets.
 * The PNG files themselves are git-ignored (see scripts/import-package.ts).
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

const crests = import.meta.glob('../../content/candidates/crests/*.json', { eager: true, import: 'default' })
const elements = import.meta.glob('../../content/candidates/elements/*.json', { eager: true, import: 'default' })
const puzzles = import.meta.glob('../../content/candidates/puzzles/*.json', { eager: true, import: 'default' })
const meta = import.meta.glob('../../content/candidates/meta.json', { eager: true, import: 'default' })
const assetModules = import.meta.glob('../../content/candidates/assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** Clubs and the daily schedule are supplied by the loader (real club list; generated dev schedule). */
export const candidateRaw: Omit<RawContent, 'clubs' | 'daily' | 'competitions'> = {
  contentVersion: String((Object.values(meta)[0] as { contentVersion?: string })?.contentVersion ?? 'candidates-0'),
  crests: collect(crests),
  elements: collect(elements),
  puzzles: collect(puzzles),
}

/** assetPath ("candidates/<file>.png") -> served URL */
export const candidateAssetUrls: Record<string, string> = Object.fromEntries(
  Object.entries(assetModules).map(([path, url]) => [`candidates/${path.split('/').pop()}`, url as string]),
)
