export interface PuzzleRef {
  id: string
  revision: number
}

export interface PracticeCandidate extends PuzzleRef {
  clubId: string
}

/** Small deterministic PRNG so a session's shuffled order can be stored as a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * One cycle of practice puzzles: at most one puzzle per club (so a club never
 * repeats until the pool is exhausted), shuffled once. When a new cycle
 * starts, the first puzzle avoids the club that ended the previous cycle.
 */
export function buildPracticeOrder(
  candidates: readonly PracticeCandidate[],
  seed: number,
  lastClubId: string | null = null,
): PuzzleRef[] {
  const rand = mulberry32(seed)
  const byClub = new Map<string, PracticeCandidate[]>()
  for (const c of candidates) {
    const list = byClub.get(c.clubId) ?? []
    list.push(c)
    byClub.set(c.clubId, list)
  }
  // Map iteration order is insertion order, so sort for determinism.
  const clubIds = [...byClub.keys()].sort()
  const picks = clubIds.map((clubId) => {
    const options = [...byClub.get(clubId)!].sort(
      (a, b) => a.id.localeCompare(b.id) || a.revision - b.revision,
    )
    return options[Math.floor(rand() * options.length)]
  })
  const order = shuffle(picks, rand)
  if (lastClubId && order.length > 1 && order[0].clubId === lastClubId) {
    const swapWith = 1 + Math.floor(rand() * (order.length - 1))
    ;[order[0], order[swapWith]] = [order[swapWith], order[0]]
  }
  return order.map(({ id, revision }) => ({ id, revision }))
}
