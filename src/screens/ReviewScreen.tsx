import { useMemo, useState } from 'react'
import type { ActiveContent } from '../content/load.ts'
import type { ContentRepository } from '../content/repository.ts'
import type { Puzzle } from '../content/schemas.ts'
import { labelFor } from '../domain/search.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import { puzzleKey, reviewCounts, type ReviewDecision, type ReviewFile } from '../review/schema.ts'
import { useReviewFile } from '../review/useReviewFile.ts'

type Filter = 'all' | 'pending' | 'approved' | 'changes' | 'rejected'
const FILTERS: Filter[] = ['all', 'pending', 'approved', 'changes', 'rejected']

/**
 * Development-only review screen (stage B). The owner looks at every draft puzzle: the full crest, each
 * piece in its reveal order, the assistant's note; then approves it (three confirmations + a reviewer
 * name), asks for changes, or rejects it. Decisions are saved to content/reviews/review.json.
 */
export default function ReviewScreen({ content }: { content: ActiveContent }) {
  const { t, lang } = useI18n()
  const { file, save, status } = useReviewFile()
  const [filter, setFilter] = useState<Filter>('all')
  const repo = content.repo

  const puzzles = useMemo(() => repo.playablePuzzles(), [repo])
  const byClub = useMemo(() => {
    const groups = new Map<string, Puzzle[]>()
    for (const p of puzzles) groups.set(p.clubId, [...(groups.get(p.clubId) ?? []), p])
    const collator = new Intl.Collator(lang)
    return [...groups.entries()]
      .map(([clubId, list]) => ({ clubId, label: labelFor(content.searchIndex, clubId, lang), list }))
      .sort((a, b) => collator.compare(a.label, b.label))
  }, [puzzles, content.searchIndex, lang])

  if (content.mode !== 'candidate') {
    return (
      <section className="panel">
        <h2>{t('review.title')}</h2>
        <p>{t('review.needsCandidates')}</p>
      </section>
    )
  }
  if (!file) return <p className="muted">{t('clue.loading')}</p>

  const counts = reviewCounts(file, puzzles.map(puzzleKey))
  const visible = (p: Puzzle) => {
    const d = file.puzzles[puzzleKey(p)]
    return filter === 'all' || (filter === 'pending' ? !d : d?.decision === filter)
  }

  return (
    <section className="review">
      <div className="panel">
        <h2>{t('review.title')}</h2>
        <p className="muted">{t('review.devOnly')}</p>
        <label className="field-label" htmlFor="reviewer">
          {t('review.reviewer')}
        </label>
        <input
          id="reviewer"
          className="input"
          value={file.reviewer}
          placeholder={t('review.reviewerHint')}
          onChange={(e) => save({ ...file, reviewer: e.target.value })}
        />
        <p className="review-summary" role="status">
          {t('review.summary', counts)}
        </p>
        <p className={status === 'failed' ? 'feedback' : 'muted'} role="status">
          {status === 'saving' && t('review.saving')}
          {status === 'saved' && t('review.saved')}
          {status === 'failed' && t('review.saveFailed')}
        </p>
        <label className="field-label" htmlFor="review-filter">
          {t('review.filter')}
        </label>
        <select id="review-filter" className="input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {t(`review.filter.${f}`)}
            </option>
          ))}
        </select>
      </div>

      {byClub.map(({ clubId, label, list }) => {
        const shown = list.filter(visible)
        if (shown.length === 0) return null
        return (
          <details key={clubId} className="panel review-club" open={filter !== 'all'}>
            <summary>
              <strong>{label}</strong>{' '}
              <span className="muted">{t('review.puzzleCount', { n: list.length })}</span>
            </summary>
            <ClubLibrary repo={repo} puzzles={list} />
            {shown.map((puzzle) => (
              <PuzzleCard key={puzzleKey(puzzle)} repo={repo} puzzle={puzzle} file={file} save={save} />
            ))}
          </details>
        )
      })}
    </section>
  )
}

function pieceLabel(repo: ContentRepository, id: string): string {
  const element = repo.getElement(id)
  const hebrew = (element?.sourceMapping as { labelHe?: string } | undefined)?.labelHe
  return hebrew ?? element?.internalLabel ?? ''
}

/** Pieces of this club's crest that no puzzle uses yet. */
function ClubLibrary({ repo, puzzles }: { repo: ContentRepository; puzzles: Puzzle[] }) {
  const { t } = useI18n()
  const used = new Set(puzzles.flatMap((p) => p.revealOrder))
  const unused = repo.elementsOfCrest(puzzles[0].crestVersionId).filter((e) => !used.has(e.id))
  if (unused.length === 0) return null
  return (
    <details className="review-library">
      <summary>{t('review.library', { n: unused.length })}</summary>
      <div className="review-seq">
        {unused.map((e) => (
          <figure key={e.id} className="review-tile">
            <div className="review-media" data-tone={e.tileTone ?? 'mid'}>
              <img src={repo.assetUrl(e.assetPath)} alt="" />
            </div>
            <figcaption>
              {pieceLabel(repo, e.id)}
              {e.autoSelectable === false && <span className="muted"> · {t('review.blocked')}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </details>
  )
}

function PuzzleCard({
  repo,
  puzzle,
  file,
  save,
}: {
  repo: ContentRepository
  puzzle: Puzzle
  file: ReviewFile
  save: (next: ReviewFile) => void
}) {
  const { t } = useI18n()
  const key = puzzleKey(puzzle)
  const stored = file.puzzles[key]
  const playable = repo.getPlayablePuzzle({ id: puzzle.id, revision: puzzle.revision })
  const [confirmations, setConfirmations] = useState(
    stored?.confirmations ?? { crestMatchesSource: false, piecesFaithfulAndReadable: false, orderAcceptable: false },
  )
  const [note, setNote] = useState(stored?.note ?? '')
  const allConfirmed =
    confirmations.crestMatchesSource && confirmations.piecesFaithfulAndReadable && confirmations.orderAcceptable
  const canApprove = allConfirmed && file.reviewer.trim().length > 0

  function decide(decision: ReviewDecision['decision']) {
    save({
      ...file,
      puzzles: { ...file.puzzles, [key]: { decision, note, decidedAt: new Date().toISOString(), confirmations } },
    })
  }
  function reset() {
    const { [key]: _removed, ...rest } = file.puzzles
    void _removed
    save({ ...file, puzzles: rest })
  }

  if (!playable) return null
  const toggle = (name: keyof typeof confirmations) => setConfirmations({ ...confirmations, [name]: !confirmations[name] })

  return (
    <article className="review-card" data-decision={stored?.decision ?? 'pending'}>
      <div className="review-head">
        <span className={`review-status is-${stored?.decision ?? 'pending'}`}>{t(`review.status.${stored?.decision ?? 'pending'}`)}</span>
        <span className="muted">{t('review.sequence', { n: playable.elements.length })}</span>
      </div>

      <div className="review-body">
        <figure className="review-crest">
          <div className="review-media" data-tone="mid">
            <img src={playable.crestUrl} alt="" />
          </div>
          <figcaption>{t('review.fullCrest')}</figcaption>
        </figure>
        <div className="review-seq">
          {playable.elements.map((e, i) => (
            <figure key={e.id} className="review-tile">
              <div className="review-media" data-tone={e.tone}>
                <img src={e.url} alt="" />
              </div>
              <figcaption>
                {i + 1}. {pieceLabel(repo, e.id)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <p className="muted review-notes">{puzzle.editorialNotes}</p>

      <fieldset className="review-confirm">
        <legend className="sr-only">{t('review.confirmHelp')}</legend>
        <label>
          <input type="checkbox" checked={confirmations.crestMatchesSource} onChange={() => toggle('crestMatchesSource')} />
          {t('review.confirm.crest')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={confirmations.piecesFaithfulAndReadable}
            onChange={() => toggle('piecesFaithfulAndReadable')}
          />
          {t('review.confirm.pieces')}
        </label>
        <label>
          <input type="checkbox" checked={confirmations.orderAcceptable} onChange={() => toggle('orderAcceptable')} />
          {t('review.confirm.order')}
        </label>
      </fieldset>

      <label className="field-label" htmlFor={`note-${key}`}>
        {t('review.note')}
      </label>
      <textarea id={`note-${key}`} className="input review-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="button-row">
        <button type="button" className="btn btn-primary" disabled={!canApprove} onClick={() => decide('approved')}>
          {t('review.approve')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => decide('changes')}>
          {t('review.changes')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => decide('rejected')}>
          {t('review.reject')}
        </button>
        {stored && (
          <button type="button" className="btn btn-link" onClick={reset}>
            {t('review.reset')}
          </button>
        )}
      </div>
      {!canApprove && <p className="muted hint">{t('review.confirmHelp')}</p>}
    </article>
  )
}
