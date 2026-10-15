/**
 * Import an owner-provided PNG package (manifest.json + one folder per club) as CANDIDATE content:
 * real crests that are still drafts. Usage:
 *
 *   node scripts/import-package.ts "C:\path\to\Badge-DNA-PNG-v2"
 *
 * What it does (and does not do):
 * - trims the transparent margin of each element (allowed by the spec), keeps pixels untouched;
 * - gives every file a neutral id derived from the package's SHA-256 (no club names in asset paths);
 * - sets rights/fidelity/visual review flags to NOT reviewed, and every puzzle to `draft`;
 * - writes assets to content/candidates/assets (git-ignored: usage rights are undocumented);
 * - writes JSON to content/candidates and provenance to content/sources/.
 * Reveal orders come from scripts/candidate-sequences.ts: assistant-written drafts, unreviewed.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import pngjs from 'pngjs'
import { DRAFTS, EXCLUDED } from './candidate-sequences.ts'

const { PNG } = pngjs
const root = resolve(import.meta.dirname, '..')
const packageDir = process.argv[2]
if (!packageDir || !existsSync(join(packageDir, 'manifest.json'))) {
  console.error('usage: node scripts/import-package.ts <package folder containing manifest.json>')
  process.exit(2)
}

/** package club id -> our club id (content/clubs/clubs.json) */
const CLUB_IDS: Record<string, string> = {
  arsenal: 'arsenal', manchester_city: 'manchester-city', brighton: 'brighton', everton: 'everton',
  brentford: 'brentford', chelsea: 'chelsea', leeds: 'leeds-united', hull_city: 'hull-city',
  liverpool: 'liverpool', ipswich: 'ipswich-town', manchester_united: 'manchester-united',
  nottingham_forest: 'nottingham-forest', aston_villa: 'aston-villa', bournemouth: 'bournemouth',
  fulham: 'fulham', tottenham: 'tottenham', crystal_palace: 'crystal-palace',
  newcastle: 'newcastle-united', sunderland: 'sunderland', coventry: 'coventry-city',
}

interface PackageObject {
  id: string
  labelHe: string
  semanticGroup: string
  singleLetter: boolean
  png: string
  size: [number, number]
  notesHe: string
  sourceOcclusionNoteHe: string | null
  eligibleForAutomaticSelection: boolean
  sha256: string
}
interface PackageClub {
  id: string
  folder: string
  logo: string
  sourceUrl: string
  objects: PackageObject[]
}

const sha8 = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 8)
const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')
const groupName = (o: PackageObject) => o.semanticGroup.replace(/^\d+-/, '')

function semanticType(name: string): string {
  const table: [RegExp, string][] = [
    [/letter/, 'typography'], [/year/, 'typography'],
    [/banner|scroll/, 'ribbon'], [/football|ball/, 'ball'],
    [/ring|outline|frame|border|disc|field|panels|shield-border/, 'frame'],
    [/stripes|bands|chevron|lines|waves|diagonal/, 'pattern'], [/star/, 'symbol'],
    [/tree|rose|laurel|branch|trunk/, 'plant'],
    [/tower|castle|palace|bridge|temple|monument/, 'structure'],
    [/ship|staff|flag|cannon|wheel/, 'object'],
    [/lion|seahorse|bird|eagle|tiger|bee|horse|elephant|devil|head|tail|body|torso|leg|wings|seagull|muzzle|ear|player/, 'figure'],
  ]
  return table.find(([re]) => re.test(name))?.[1] ?? 'shape'
}

/** Light artwork gets a dark tile, dark artwork a light one; mixed/coloured artwork the mid tile. */
function toneOf(png: InstanceType<typeof PNG>): 'light' | 'mid' | 'dark' {
  let sum = 0, weight = 0
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3] / 255
    if (a === 0) continue
    sum += (0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) * a
    weight += a
  }
  const mean = weight ? sum / weight : 128
  return mean > 205 ? 'dark' : mean < 75 ? 'light' : 'mid'
}

function trim(png: InstanceType<typeof PNG>, pad = 2) {
  let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) throw new Error('fully transparent image')
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(png.width - 1, x1 + pad); y1 = Math.min(png.height - 1, y1 + pad)
  const out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 })
  PNG.bitblt(png, out, x0, y0, out.width, out.height, 0, 0)
  return out
}

const manifest = JSON.parse(readFileSync(join(packageDir, 'manifest.json'), 'utf8')) as { clubs: PackageClub[]; version: string }
const outDir = join(root, 'content', 'candidates')
const assetsDir = join(outDir, 'assets')
rmSync(outDir, { recursive: true, force: true })
for (const sub of ['assets', 'crests', 'elements', 'puzzles']) mkdirSync(join(outDir, sub), { recursive: true })

const crests: unknown[] = []
const elements: unknown[] = []
const puzzles: unknown[] = []
const provenance: unknown[] = []
const skippedLog: string[] = []
const usedIds = new Set<string>()
const unique = (id: string) => {
  if (usedIds.has(id)) throw new Error(`id collision: ${id}`)
  usedIds.add(id)
  return id
}

for (const club of manifest.clubs) {
  const clubId = CLUB_IDS[club.id]
  if (!clubId) throw new Error(`no club mapping for package club ${club.id}`)
  const dir = join(packageDir, club.folder)

  const logoBuf = readFileSync(join(dir, club.logo))
  const crestId = unique(`c_${sha256(logoBuf).slice(0, 8)}`)
  writeFileSync(join(assetsDir, `${crestId}.png`), logoBuf)
  crests.push({
    id: crestId, clubId, variantLabel: `PNG-v2 package (${manifest.version})`,
    validFrom: null, validTo: null,
    fullAssetPath: `candidates/${crestId}.png`,
    sourceUrl: club.sourceUrl,
    // The package date, not necessarily when the original was fetched; the package does not say.
    retrievedAt: '2026-10-15',
    sourceSha256: sha256(logoBuf),
    rightsStatus: 'review_required', rightsEvidence: null, attributionText: null, fidelityReviewed: false,
  })
  provenance.push({ kind: 'crest', id: crestId, clubId, packageFile: `${club.folder}/${club.logo}`, sha256: sha256(logoBuf), sourceUrl: club.sourceUrl })

  const byGroup = new Map<string, string>() // semantic group -> element id
  for (const o of club.objects) {
    const buf = readFileSync(join(dir, o.png))
    if (sha256(buf) !== o.sha256) throw new Error(`${o.id}: file does not match its manifest hash`)
    const full = PNG.sync.read(buf)
    const cropped = trim(full)
    const elementId = unique(`e_${o.sha256.slice(0, 8)}`)
    writeFileSync(join(assetsDir, `${elementId}.png`), PNG.sync.write(cropped))
    byGroup.set(groupName(o), elementId)
    const name = groupName(o)
    elements.push({
      id: elementId, crestVersionId: crestId, semanticType: semanticType(name), internalLabel: name,
      assetPath: `candidates/${elementId}.png`, pixelWidth: cropped.width, pixelHeight: cropped.height,
      parentElementId: null,
      containsText: o.singleLetter || /year/.test(name),
      fidelityReviewed: false, visualReviewed: false, extractionMethod: 'manual',
      sourceMapping: { package: manifest.version, packageSha256: o.sha256, packageObjectId: o.id },
      tileTone: toneOf(cropped),
      autoSelectable: o.eligibleForAutomaticSelection,
    })
    provenance.push({
      kind: 'element', id: elementId, clubId, packageFile: `${club.folder}/${o.png}`, sha256: o.sha256,
      labelHe: o.labelHe, singleLetter: o.singleLetter, packageEligible: o.eligibleForAutomaticSelection,
      sourceOcclusionNoteHe: o.sourceOcclusionNoteHe, excludedFromDrafts: EXCLUDED[`${club.id}:${name}`] ?? null,
    })
  }

  const variants = DRAFTS[club.id]
  if (!variants) throw new Error(`no draft sequences for ${club.id}`)
  for (const v of variants) {
    const ids = v.order.map((name) => {
      if (EXCLUDED[`${club.id}:${name}`]) throw new Error(`${club.id}:${name} is excluded but used in variant ${v.key}`)
      const id = byGroup.get(name)
      if (!id) throw new Error(`${club.id}: unknown piece "${name}" in variant ${v.key}`)
      return id
    })
    if (ids.length < 3 || ids.length > 5) throw new Error(`${club.id}/${v.key}: ${ids.length} reveals`)
    puzzles.push({
      id: unique(`pz_${sha8(`${clubId}:${v.key}`)}`), revision: 1, clubId, crestVersionId: crestId,
      revealOrder: ids, status: 'draft', audience: 'premier-league-2026-27-draft',
      familiarity: 'uncalibrated', difficultyStatus: 'uncalibrated',
      editorialNotes: `Assistant-written draft order, unreviewed, untested. ${v.note}.`,
      reviewedBy: null, reviewedAt: null, scoringVersion: 'scoring-v1',
    })
  }
  const unusedPieces = club.objects.map(groupName).filter((n) => !variants.some((v) => v.order.includes(n)))
  if (unusedPieces.length) skippedLog.push(`${club.id}: not used in any draft: ${unusedPieces.join(', ')}`)
}

const write = (rel: string, data: unknown) => writeFileSync(join(outDir, rel), JSON.stringify(data, null, 2) + '\n')
write('crests/crests.json', crests)
write('elements/elements.json', elements)
write('puzzles/puzzles.json', puzzles)
write('meta.json', { contentVersion: `candidates-${manifest.version.toLowerCase()}` })
mkdirSync(join(root, 'content', 'sources'), { recursive: true })
writeFileSync(join(root, 'content', 'sources', 'png-v2.json'), JSON.stringify(provenance, null, 2) + '\n')

console.log(`imported ${crests.length} crests, ${elements.length} elements, ${puzzles.length} draft puzzles`)
console.log(`assets written: ${readdirSync(assetsDir).length} files in content/candidates/assets (git-ignored)`)
skippedLog.forEach((line) => console.log('  ' + line))
