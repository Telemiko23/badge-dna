/**
 * Re-pack a piece made of small parts that sit far apart (e.g. the two numbers of a founding year
 * at opposite sides of a crest) into one compact image, so it stays readable on a phone card.
 * Owner-approved for specific pieces (2026-10-15); it breaks the package rule that spacing inside
 * a unit stays as in the original, so every re-packed piece is recorded as such.
 *
 * It only MOVES original pixels: nothing is redrawn, recoloured, rotated, mirrored or resized.
 * Parts keep their reading order (left-to-right or top-to-bottom, following their original positions).
 */
import pngjs from 'pngjs'

const { PNG } = pngjs
type Png = InstanceType<typeof PNG>

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface RepackResult {
  png: Png
  parts: Rect[]
  layout: 'row' | 'column'
}

const ALPHA_MIN = 8
const DUST_PIXELS = 8

/** 8-connected components of visible pixels, as bounding boxes with their pixel counts. */
function components(png: Png): (Rect & { area: number })[] {
  const { width, height, data } = png
  const seen = new Uint8Array(width * height)
  const out: (Rect & { area: number })[] = []
  const stack: number[] = []
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || data[start * 4 + 3] <= ALPHA_MIN) continue
    seen[start] = 1
    stack.push(start)
    const r = { x0: width, y0: height, x1: 0, y1: 0, area: 0 }
    while (stack.length) {
      const p = stack.pop()!
      const x = p % width
      const y = (p - x) / width
      r.area++
      if (x < r.x0) r.x0 = x
      if (x > r.x1) r.x1 = x
      if (y < r.y0) r.y0 = y
      if (y > r.y1) r.y1 = y
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const n = ny * width + nx
          if (!seen[n] && data[n * 4 + 3] > ALPHA_MIN) {
            seen[n] = 1
            stack.push(n)
          }
        }
      }
    }
    if (r.area >= DUST_PIXELS) out.push(r)
  }
  return out
}

const gapBetween = (a: Rect, b: Rect) => ({
  x: Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1)),
  y: Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1)),
})

/** Groups components whose boxes are within `mergeGap` pixels of each other in both directions. */
export function findParts(png: Png, mergeGap: number): Rect[] {
  const comps = components(png)
  const parent = comps.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < comps.length; i++) {
    for (let j = i + 1; j < comps.length; j++) {
      const g = gapBetween(comps[i], comps[j])
      if (g.x <= mergeGap && g.y <= mergeGap) parent[find(i)] = find(j)
    }
  }
  const groups = new Map<number, Rect>()
  comps.forEach((c, i) => {
    const root = find(i)
    const g = groups.get(root)
    groups.set(
      root,
      g
        ? { x0: Math.min(g.x0, c.x0), y0: Math.min(g.y0, c.y0), x1: Math.max(g.x1, c.x1), y1: Math.max(g.y1, c.y1) }
        : { x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 },
    )
  })
  return [...groups.values()]
}

const widthOf = (r: Rect) => r.x1 - r.x0 + 1
const heightOf = (r: Rect) => r.y1 - r.y0 + 1

export interface RepackOptions {
  /** Parts closer than this (px, at the source resolution) belong together. */
  mergeGap?: number
  /** Space between parts, as a fraction of the average part size. */
  gapRatio?: number
  /** Box used to choose between a row and a column layout (the clue tile, in px). */
  tile?: number
}

export function repack(src: Png, options: RepackOptions = {}): RepackResult {
  const { mergeGap = 60, gapRatio = 0.18, tile = 138 } = options
  const parts = findParts(src, mergeGap)
  if (parts.length === 0) throw new Error('nothing visible to pack')

  const cx = (r: Rect) => (r.x0 + r.x1) / 2
  const cy = (r: Rect) => (r.y0 + r.y1) / 2
  const spreadX = Math.max(...parts.map(cx)) - Math.min(...parts.map(cx))
  const spreadY = Math.max(...parts.map(cy)) - Math.min(...parts.map(cy))
  // Reading order follows the direction in which the parts were originally spread.
  const ordered = [...parts].sort((a, b) => (spreadX >= spreadY ? cx(a) - cx(b) : cy(a) - cy(b)))

  const pad = 2
  const avg = ordered.reduce((sum, r) => sum + Math.max(widthOf(r), heightOf(r)), 0) / ordered.length
  const gap = Math.round(avg * gapRatio)

  const sizeFor = (layout: 'row' | 'column') => {
    const w = layout === 'row' ? ordered.reduce((s, r) => s + widthOf(r), 0) + gap * (ordered.length - 1) : Math.max(...ordered.map(widthOf))
    const h = layout === 'column' ? ordered.reduce((s, r) => s + heightOf(r), 0) + gap * (ordered.length - 1) : Math.max(...ordered.map(heightOf))
    return { w: w + 2 * pad, h: h + 2 * pad }
  }
  const fit = (s: { w: number; h: number }) => Math.min(tile / s.w, tile / s.h)
  const layout: 'row' | 'column' = ordered.length === 1 || fit(sizeFor('row')) >= fit(sizeFor('column')) ? 'row' : 'column'
  const size = sizeFor(layout)

  const out = new PNG({ width: size.w, height: size.h })
  let offset = pad
  for (const r of ordered) {
    const w = widthOf(r)
    const h = heightOf(r)
    const dx = layout === 'row' ? offset : pad + Math.floor((size.w - 2 * pad - w) / 2)
    const dy = layout === 'column' ? offset : pad + Math.floor((size.h - 2 * pad - h) / 2)
    PNG.bitblt(src, out, r.x0, r.y0, w, h, dx, dy)
    offset += (layout === 'row' ? w : h) + gap
  }
  return { png: out, parts: ordered, layout }
}
