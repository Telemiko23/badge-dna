/**
 * Mechanical content validation: `npm run validate:content`.
 * Reads content/ (and content/fixtures/) straight from disk, validates schemas,
 * references, files and publish gates, and exits non-zero on any error.
 * It does NOT replace human review of element meaning and fidelity to the source.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { RawContent } from '../src/content/schemas.ts'
import { validateContent } from '../src/content/validate.ts'

const root = resolve(import.meta.dirname, '..')

function readCollection(dir: string): unknown[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .flatMap((name) => {
      const value: unknown = JSON.parse(readFileSync(join(dir, name), 'utf8'))
      return Array.isArray(value) ? value : [value]
    })
}

function readMeta(dir: string): string {
  const file = join(dir, 'meta.json')
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { contentVersion: string }).contentVersion : 'unversioned'
}

function load(dir: string): RawContent {
  return {
    contentVersion: readMeta(dir),
    clubs: readCollection(join(dir, 'clubs')),
    crests: readCollection(join(dir, 'crests')),
    elements: readCollection(join(dir, 'elements')),
    puzzles: readCollection(join(dir, 'puzzles')),
    daily: readCollection(join(dir, 'daily')),
  }
}

let failed = false

function report(label: string, content: RawContent, kind: 'real' | 'fixture', assetRoot: (p: string) => string) {
  const issues = validateContent(content, { kind, assetExists: (p) => existsSync(assetRoot(p)) })
  const errors = issues.filter((i) => i.severity === 'error')
  console.log(
    `${label}: ${content.clubs.length} clubs, ${content.crests.length} crests, ${content.elements.length} elements, ` +
      `${content.puzzles.length} puzzles, ${content.daily.length} daily -> ${errors.length} errors, ${issues.length - errors.length} warnings`,
  )
  for (const issue of issues) console.log(`  [${issue.severity}] ${issue.code}: ${issue.message}`)
  if (errors.length > 0) failed = true
}

report('real', load(join(root, 'content')), 'real', (p) => join(root, 'public', p))
report('fixtures', load(join(root, 'content', 'fixtures')), 'fixture', (p) =>
  join(root, 'content', 'fixtures', 'assets', p.replace(/^fixtures\//, '')),
)

process.exit(failed ? 1 : 0)
