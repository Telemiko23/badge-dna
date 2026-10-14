import { describe, expect, it } from 'vitest'
import { buildSearchIndex, normalizeSearch, searchClubs, type SearchableClub } from '../src/domain/search.ts'

function club(id: string, he: string, en: string, aliases: string[] = [], extra: Partial<SearchableClub> = {}): SearchableClub {
  return { id, displayName: { he, en }, aliases, countryCode: 'GB', active: true, ...extra }
}

const clubs = [
  club('arsenal', 'ארסנל', 'Arsenal', ['Arsenal FC']),
  club('chelsea', 'צ׳לסי', 'Chelsea'),
  club('man-utd', 'מנצ׳סטר יונייטד', 'Manchester United', ['Man Utd', 'Man United']),
  club('man-city', 'מנצ׳סטר סיטי', 'Manchester City', ['Man City']),
  club('real-madrid', 'ריאל מדריד', 'Real Madrid'),
  club('atletico', 'אתלטיקו מדריד', 'Atlético Madrid', ['Atletico Madrid']),
  club('gone', 'לא פעילה', 'Inactive FC', [], { active: false }),
]
const index = buildSearchIndex(clubs)

describe('normalizeSearch', () => {
  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(normalizeSearch('  Atlético   MADRID ')).toBe('atletico madrid')
    expect(normalizeSearch("St. Pauli-FC")).toBe('st pauli fc')
  })

  it('treats Hebrew geresh variants and niqqud as the same text', () => {
    expect(normalizeSearch("צ'לסי")).toBe(normalizeSearch('צ׳לסי'))
    expect(normalizeSearch('אַרְסֶנָל')).toBe('ארסנל')
  })

  it('never drops words that tell clubs apart', () => {
    expect(normalizeSearch('Real Madrid')).not.toBe(normalizeSearch('Atlético Madrid'))
  })
})

describe('searchClubs', () => {
  const ids = (q: string, lang: 'he' | 'en' = 'he') => searchClubs(index, q, lang).map((s) => s.clubId)

  it('needs at least two characters', () => {
    expect(ids('a')).toEqual([])
    expect(ids(' a ')).toEqual([])
    expect(ids('ar')).toContain('arsenal')
  })

  it('finds clubs by Hebrew name, English name and aliases', () => {
    expect(ids('ארסנל')).toEqual(['arsenal'])
    expect(ids('arsenal fc')).toEqual(['arsenal'])
    expect(ids('man utd')).toEqual(['man-utd'])
    expect(ids("צ'לס")).toEqual(['chelsea'])
  })

  it('puts exact and prefix matches before partial ones', () => {
    expect(ids('madrid', 'en')).toEqual(['atletico', 'real-madrid'])
    const exactFirst = searchClubs(buildSearchIndex([...clubs, club('x', 'סיטי חדשה', 'Brand City')]), 'city', 'en')
    expect(exactFirst.map((s) => s.clubId)).toContain('man-city')
  })

  it('matches multi-word queries by word prefixes', () => {
    expect(ids('man u')).toEqual(['man-utd'])
    expect(ids('real mad', 'en')).toEqual(['real-madrid'])
  })

  it('limits suggestions to eight and never offers inactive clubs', () => {
    const many = Array.from({ length: 20 }, (_, i) => club(`c${i}`, `קבוצה ${i}`, `Team ${i}`))
    expect(searchClubs(buildSearchIndex(many), 'team', 'en')).toHaveLength(8)
    expect(ids('inactive', 'en')).toEqual([])
  })

  it('does not reveal anything about a hidden answer: results depend only on the query', () => {
    expect(ids('mad', 'en')).toEqual(ids('mad', 'en'))
  })

  it('adds a short disambiguator only for identical display names', () => {
    const twins = buildSearchIndex([
      club('t1', 'יונייטד', 'United', [], { city: { he: 'לונדון', en: 'London' } }),
      club('t2', 'יונייטד', 'United', [], { countryCode: 'IL' }),
      club('solo', 'סולו', 'Solo'),
    ])
    const labels = searchClubs(twins, 'united', 'en').map((s) => s.label).sort()
    expect(labels).toEqual(['United (IL)', 'United (London)'])
    expect(searchClubs(twins, 'solo', 'en')[0].label).toBe('Solo')
  })

  it('does not auto-select an ambiguous alias: every owner is listed', () => {
    const shared = buildSearchIndex([club('a', 'א', 'Alpha FC', ['The Reds']), club('b', 'ב', 'Beta FC', ['The Reds'])])
    expect(searchClubs(shared, 'the reds', 'en')).toHaveLength(2)
  })
})
