/**
 * Stage C: publish the puzzles the owner approved in the review screen.
 *
 *   node scripts/promote.ts --dry-run          show what would happen, change nothing
 *   node scripts/promote.ts                    publish (copies assets, writes the promoted.json files in content/crests, elements, puzzles and daily)
 *   options: --days=14 (new daily dates to add, default 14), --no-daily
 *
 * Nothing is published unless content/reviews/review.json has "approved" decisions made by the owner.
 * The generated files are validated with the same rules as real content before anything is written.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gameDateUtc } from '../src/domain/dates.ts'
import { parseRawContent, type RawContent } from '../src/content/schemas.ts'
import { validateContent } from '../src/content/validate.ts'
import { ReviewFileSchema } from '../src/review/schema.ts'
import { planPromotion, type PublishedSet, type RightsBasis } from './promote-lib.ts'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dailyDays = args.includes('--no-daily') ? 0 : Number(args.find((a) => a.startsWith('--days='))?.slice(7) ?? 14)

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
const content = (...parts: string[]) => join(root, 'content', ...parts)

function readCollection(dir: string, exclude: string[] = []): unknown[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !exclude.includes(f))
    .sort()
    .flatMap((f) => {
      const value: unknown = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      return Array.isArray(value) ? value : [value]
    })
}

// `--review=<file>` reads decisions from another file (for dry-run checks only; it requires --dry-run).
const reviewArg = args.find((x) => x.startsWith('--review='))?.slice(9)
const reviewPath = reviewArg ? resolve(reviewArg) : content('reviews', 'review.json')
if (reviewArg && !dryRun) {
  console.error('--review=<file> is only allowed together with --dry-run.')
  process.exit(2)
}
if (!existsSync(reviewPath)) {
  console.log('No review decisions found (content/reviews/review.json). Nothing to publish.')
  process.exit(0)
}
const parsedReview = ReviewFileSchema.safeParse(readJson(reviewPath))
if (!parsedReview.success) {
  console.error('review.json is invalid:', parsedReview.error.issues.map((i) => i.message).join('; '))
  process.exit(1)
}
const review = parsedReview.data
const approvedCount = Object.values(review.puzzles).filter((d) => d.decision === 'approved').length
if (approvedCount === 0) {
  console.log('The review file has no approved puzzles. Nothing to publish.')
  process.exit(0)
}

const rights = readJson<RightsBasis>(content('reviews', 'rights-basis.json'))
// What was already released is whatever is in the promoted.json files; they are regenerated from it plus the new approvals.
function readPromoted(dir: string): unknown[] {
  const file = content(dir, 'promoted.json')
  return existsSync(file) ? readJson<unknown[]>(file) : []
}
const existingRaw = {
  crests: readPromoted('crests'),
  elements: readPromoted('elements'),
  puzzles: readPromoted('puzzles'),
  daily: readPromoted('daily'),
}
const parsedExisting = parseRawContent({ contentVersion: 'x', clubs: [], ...existingRaw, competitions: [] })
if (parsedExisting.issues.length > 0) {
  console.error('existing real content is invalid:', parsedExisting.issues[0].message)
  process.exit(1)
}
const existing: PublishedSet = {
  crests: parsedExisting.content.crests,
  elements: parsedExisting.content.elements,
  puzzles: parsedExisting.content.puzzles,
  daily: parsedExisting.content.daily,
}

const meta = readJson<{ contentVersion: string }>(content('meta.json'))
const plan = planPromotion({
  candidate: {
    crests: readCollection(content('candidates', 'crests')),
    elements: readCollection(content('candidates', 'elements')),
    puzzles: readCollection(content('candidates', 'puzzles')),
  },
  existing,
  review,
  rights,
  today: gameDateUtc(Date.now()),
  contentVersion: meta.contentVersion,
  dailyDays,
})

// Validate exactly what would be shipped.
const candidateAssets = content('candidates', 'assets')
const publicAssets = join(root, 'public', 'assets')
const willCopy = new Set(plan.assetCopies.map(([, to]) => `assets/${to}`))
const merged: RawContent = {
  contentVersion: meta.contentVersion,
  clubs: readCollection(content('clubs')),
  crests: [...readCollection(content('crests'), ['promoted.json']), ...plan.crests],
  elements: [...readCollection(content('elements'), ['promoted.json']), ...plan.elements],
  puzzles: [...readCollection(content('puzzles'), ['promoted.json']), ...plan.puzzles],
  daily: [...readCollection(content('daily'), ['promoted.json']), ...plan.daily],
  competitions: [],
}
const issues = validateContent(merged, {
  kind: 'real',
  assetExists: (p) => willCopy.has(p) || existsSync(join(root, 'public', p)),
})
for (const [from] of plan.assetCopies) {
  if (!existsSync(join(candidateAssets, from))) {
    issues.push({ severity: 'error', code: 'missing-asset', message: `candidate asset not on this machine: ${from}` })
  }
}

console.log(`approved by the owner: ${approvedCount}`)
console.log(`newly published: ${plan.newPuzzleKeys.length}  |  already published: ${plan.puzzles.length - plan.newPuzzleKeys.length}`)
console.log(`assets to copy: ${plan.assetCopies.length}  |  new daily dates: ${plan.newDailyDates.length} ${plan.newDailyDates[0] ?? ''}${plan.newDailyDates.length > 1 ? ' .. ' + plan.newDailyDates.at(-1) : ''}`)
for (const s of plan.skipped) console.log(`  skipped ${s.key}: ${s.reason}`)
for (const w of plan.warnings) console.log(`  warning: ${w}`)
for (const i of issues) console.log(`  [${i.severity}] ${i.code}: ${i.message}`)

if (issues.some((i) => i.severity === 'error')) {
  console.error('Validation failed. Nothing was written.')
  process.exit(1)
}
if (dryRun) {
  console.log('Dry run: nothing was written.')
  process.exit(0)
}

mkdirSync(publicAssets, { recursive: true })
for (const [from, to] of plan.assetCopies) copyFileSync(join(candidateAssets, from), join(publicAssets, to))
const write = (dir: string, data: unknown) => writeFileSync(content(dir, 'promoted.json'), JSON.stringify(data, null, 2) + '\n')
write('crests', plan.crests)
write('elements', plan.elements)
write('puzzles', plan.puzzles)
write('daily', plan.daily)
console.log('Done. Review the changes, run the tests and the content validation, then commit.')
