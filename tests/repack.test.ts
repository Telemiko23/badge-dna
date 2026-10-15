import pngjs from 'pngjs'
import { describe, expect, it } from 'vitest'
import { findParts, repack } from '../scripts/repack.ts'

const { PNG } = pngjs

function canvas(size: number) {
  return new PNG({ width: size, height: size }) // fully transparent
}
function square(png: InstanceType<typeof PNG>, x: number, y: number, side: number, rgb: [number, number, number], alpha = 255) {
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const o = ((y + j) * png.width + (x + i)) * 4
      png.data[o] = rgb[0]
      png.data[o + 1] = rgb[1]
      png.data[o + 2] = rgb[2]
      png.data[o + 3] = alpha
    }
  }
}
const visible = (png: InstanceType<typeof PNG>) => {
  const colours = new Map<string, number>()
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 0) {
      const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]},${png.data[i + 3]}`
      colours.set(key, (colours.get(key) ?? 0) + 1)
    }
  }
  return colours
}

describe('repack', () => {
  const far = () => {
    const png = canvas(400)
    square(png, 10, 190, 24, [200, 0, 0]) // left
    square(png, 366, 190, 24, [0, 0, 200], 180) // right, semi-transparent on purpose
    return png
  }

  it('finds one part per cluster and merges close fragments', () => {
    expect(findParts(far(), 20)).toHaveLength(2)
    const png = far()
    square(png, 40, 190, 10, [200, 0, 0]) // a fragment 6px from the left square
    expect(findParts(png, 20)).toHaveLength(2)
    expect(findParts(png, 2)).toHaveLength(3)
  })

  it('moves the parts next to each other without changing a single pixel value', () => {
    const before = visible(far())
    const { png, parts } = repack(far())
    expect(parts).toHaveLength(2)
    expect(visible(png)).toEqual(before) // same colours, same alpha, same counts
    expect(Math.max(png.width, png.height)).toBeLessThan(100)
  })

  it('keeps the reading order of the parts (left one first)', () => {
    const { png, layout } = repack(far())
    const firstVisible = (axis: 'x' | 'y') => {
      for (let a = 0; a < (axis === 'x' ? png.width : png.height); a++) {
        for (let b = 0; b < (axis === 'x' ? png.height : png.width); b++) {
          const o = axis === 'x' ? (b * png.width + a) * 4 : (a * png.width + b) * 4
          if (png.data[o + 3] > 0) return [png.data[o], png.data[o + 2]]
        }
      }
      return []
    }
    expect(firstVisible(layout === 'row' ? 'x' : 'y')).toEqual([200, 0]) // red first
  })

  it('refuses an empty image', () => {
    expect(() => repack(canvas(50))).toThrow()
  })
})
