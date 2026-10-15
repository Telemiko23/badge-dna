import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { EMPTY_REVIEW, ReviewFileSchema } from '../src/review/schema.ts'

/**
 * Development-only endpoint that lets the review screen save the owner's decisions to
 * content/reviews/review.json. It exists only while `vite` (dev server) runs: it is not part of any
 * build. It writes one fixed file, validates the body, and rejects requests from other origins.
 */
const FILE = resolve(import.meta.dirname, '..', 'content', 'reviews', 'review.json')
const MAX_BYTES = 1_000_000

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  return origin === undefined || origin === `http://${req.headers.host}`
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BYTES) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function reviewApi(): Plugin {
  return {
    name: 'badge-dna-review-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__review', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (!sameOrigin(req)) {
          res.statusCode = 403
          res.end(JSON.stringify({ error: 'forbidden' }))
          return
        }
        try {
          if (req.method === 'GET') {
            const parsed = existsSync(FILE) ? ReviewFileSchema.safeParse(JSON.parse(readFileSync(FILE, 'utf8'))) : null
            res.end(JSON.stringify(parsed?.success ? parsed.data : EMPTY_REVIEW))
            return
          }
          if (req.method === 'POST') {
            const parsed = ReviewFileSchema.safeParse(JSON.parse(await readBody(req)))
            if (!parsed.success) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid review file', issues: parsed.error.issues.map((i) => i.message) }))
              return
            }
            mkdirSync(dirname(FILE), { recursive: true })
            const temp = `${FILE}.tmp`
            writeFileSync(temp, JSON.stringify(parsed.data, null, 2) + '\n')
            renameSync(temp, FILE)
            res.end(JSON.stringify({ ok: true }))
            return
          }
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'method not allowed' }))
        } catch {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'bad request' }))
        }
      })
    },
  }
}
