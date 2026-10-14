import { GAME_CONFIG, type Lang } from './config.ts'

export interface SearchableClub {
  id: string
  displayName: { he: string; en: string }
  aliases: readonly string[]
  countryCode: string
  city?: { he: string; en: string }
  active: boolean
}

export interface ClubSuggestion {
  clubId: string
  /** Display label in the UI language, with a short disambiguator if needed. */
  label: string
}

/**
 * Normalisation used for matching only (never for judging a guess).
 * Words are never dropped, so "Real Madrid" and "Atlético Madrid" stay distinct.
 */
export function normalizeSearch(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Latin accents
    .replace(/[֑-ׇֽֿׁׂׅׄ]/g, '') // Hebrew points & cantillation
    .toLowerCase()
    .replace(/[.'"`´’‘“”״׳]/g, '') // punctuation that glues letters together
    .replace(/[־\-–—_/\\,;:!?()[\]{}|&+*]/g, ' ') // punctuation that separates words
    .replace(/\s+/g, ' ')
    .trim()
}

interface IndexEntry {
  club: SearchableClub
  names: string[]
}

export interface SearchIndex {
  entries: IndexEntry[]
  labels: Record<Lang, Map<string, string>>
}

function buildLabels(clubs: readonly SearchableClub[], lang: Lang): Map<string, string> {
  const counts = new Map<string, number>()
  for (const c of clubs) {
    const key = normalizeSearch(c.displayName[lang])
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const labels = new Map<string, string>()
  for (const c of clubs) {
    const name = c.displayName[lang]
    const duplicated = (counts.get(normalizeSearch(name)) ?? 0) > 1
    labels.set(c.id, duplicated ? `${name} (${c.city?.[lang] ?? c.countryCode})` : name)
  }
  return labels
}

export function buildSearchIndex(clubs: readonly SearchableClub[]): SearchIndex {
  const active = clubs.filter((c) => c.active)
  return {
    entries: active.map((club) => ({
      club,
      names: [
        ...new Set(
          [club.displayName.he, club.displayName.en, ...club.aliases]
            .map(normalizeSearch)
            .filter(Boolean),
        ),
      ],
    })),
    labels: { he: buildLabels(active, 'he'), en: buildLabels(active, 'en') },
  }
}

/** 0 exact, 1 name prefix, 2 word-prefix match, 3 substring; null = no match. */
function rank(name: string, query: string): number | null {
  if (name === query) return 0
  if (name.startsWith(query)) return 1
  const words = name.split(' ')
  const tokens = query.split(' ')
  if (tokens.every((t) => words.some((w) => w.startsWith(t)))) return 2
  if (name.includes(query)) return 3
  return null
}

export function labelFor(index: SearchIndex, clubId: string, lang: Lang): string {
  return index.labels[lang].get(clubId) ?? clubId
}

export function searchClubs(
  index: SearchIndex,
  rawQuery: string,
  lang: Lang,
  limit: number = GAME_CONFIG.search.maxSuggestions,
): ClubSuggestion[] {
  const query = normalizeSearch(rawQuery)
  if (query.length < GAME_CONFIG.search.minChars) return []

  const scored: { clubId: string; label: string; rank: number }[] = []
  for (const { club, names } of index.entries) {
    let best: number | null = null
    for (const name of names) {
      const r = rank(name, query)
      if (r !== null && (best === null || r < best)) best = r
    }
    if (best !== null) {
      scored.push({ clubId: club.id, label: labelFor(index, club.id, lang), rank: best })
    }
  }
  const collator = new Intl.Collator(lang)
  scored.sort((a, b) => a.rank - b.rank || collator.compare(a.label, b.label))
  return scored.slice(0, limit).map(({ clubId, label }) => ({ clubId, label }))
}
