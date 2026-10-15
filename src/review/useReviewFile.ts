import { useCallback, useEffect, useRef, useState } from 'react'
import { EMPTY_REVIEW, ReviewFileSchema, type ReviewFile } from './schema.ts'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

/**
 * Loads and saves the owner's review decisions through the dev server (`/__review`).
 * Saves are sent one at a time, in order, so an older save can never overwrite a newer one.
 */
export function useReviewFile() {
  const [file, setFile] = useState<ReviewFile | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const latest = useRef<ReviewFile>(EMPTY_REVIEW)
  const chain = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    fetch('/__review')
      .then((r) => r.json())
      .then((json: unknown) => {
        const parsed = ReviewFileSchema.safeParse(json)
        const loaded = parsed.success ? parsed.data : EMPTY_REVIEW
        latest.current = loaded
        if (!cancelled) setFile(loaded)
      })
      .catch(() => {
        if (!cancelled) {
          setFile(EMPTY_REVIEW)
          setStatus('failed')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback((next: ReviewFile) => {
    latest.current = next
    setFile(next)
    setStatus('saving')
    chain.current = chain.current.then(async () => {
      try {
        const response = await fetch('/__review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(latest.current),
        })
        setStatus(response.ok ? 'saved' : 'failed')
      } catch {
        setStatus('failed')
      }
    })
  }, [])

  return { file, save, status }
}
