import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayablePuzzle } from '../content/repository.ts'
import { GAME_CONFIG } from '../domain/config.ts'
import {
  canGuess,
  canReveal,
  completeReveal,
  failReveal,
  giveUp,
  isFinal,
  markFirstElementLoaded,
  markTechnicalError,
  mistakeCount,
  mistakesLeft,
  possibleScore,
  retryLoading,
  scoreAfterNextReveal,
  startReveal,
  submitGuess,
  type RoundState,
} from '../domain/round.ts'
import { labelFor, type SearchIndex } from '../domain/search.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import { logEvent } from '../storage/eventLog.ts'
import { ClubSearch } from './ClubSearch.tsx'
import { ClueCard } from './ClueCard.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { preloadImage } from './preloadImage.ts'

interface Props {
  puzzle: PlayablePuzzle
  round: RoundState
  onRoundChange: (next: RoundState) => void
  searchIndex: SearchIndex
  /** Heading above the round, e.g. "Puzzle 2 of 3". */
  heading: string
  isTestPuzzle: boolean
  nextLabel: string
  onNext: () => void
}

function MistakePips({ used, max }: { used: number; max: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < used ? 'pip is-used' : 'pip'}>
          {i < used ? '✕' : '○'}
        </span>
      ))}
    </span>
  )
}

export function RoundView({
  puzzle,
  round,
  onRoundChange,
  searchIndex,
  heading,
  isTestPuzzle,
  nextLabel,
  onNext,
}: Props) {
  const { t, tn, lang } = useI18n()
  const roundRef = useRef(round)
  useEffect(() => {
    roundRef.current = round
  }, [round])

  const [announcement, setAnnouncement] = useState('')
  const [feedback, setFeedback] = useState('')
  const [revealFailed, setRevealFailed] = useState(false)
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false)
  const [zoomed, setZoomed] = useState<number | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [crestAttempt, setCrestAttempt] = useState(0)
  const [crestFailed, setCrestFailed] = useState(false)
  const zoomRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = zoomRef.current
    if (!dialog) return
    if (zoomed !== null && !dialog.open) dialog.showModal()
    if (zoomed === null && dialog.open) dialog.close()
  }, [zoomed])

  /** Apply a pure transition against the latest state (guards against double clicks). */
  const apply = useCallback(
    (transition: (state: RoundState) => RoundState): RoundState => {
      const current = roundRef.current
      const next = transition(current)
      if (next !== current) {
        roundRef.current = next
        onRoundChange(next)
      }
      return next
    },
    [onRoundChange],
  )

  const base = { puzzleId: puzzle.ref.id, revision: puzzle.ref.revision, mode: round.mode }

  function onFirstLoaded() {
    const before = roundRef.current
    const after = apply(markFirstElementLoaded)
    if (before.status === 'loading' && after.status === 'active') {
      logEvent('round_started', { ...base, totalReveals: round.totalReveals })
    }
  }

  function onFirstError() {
    if (apply(markTechnicalError).status === 'technical_error') {
      logEvent('content_error', { ...base, where: 'first_element' })
    }
  }

  async function reveal() {
    if (!canReveal(roundRef.current)) return
    setRevealFailed(false)
    const target = puzzle.elements[roundRef.current.revealedCount]
    apply(startReveal)
    try {
      await preloadImage(target.url)
      const after = apply(completeReveal)
      setAnnouncement(t('reveal.announce', { n: after.revealedCount }))
      logEvent('element_revealed', { ...base, revealedCount: after.revealedCount })
    } catch {
      apply(failReveal)
      setRevealFailed(true)
      logEvent('content_error', { ...base, where: 'reveal' })
    }
  }

  function guess(clubId: string) {
    const current = roundRef.current
    const { state, outcome } = submitGuess(current, {
      answerClubId: puzzle.clubId,
      guessClubId: clubId,
      seenRevealedCount: round.revealedCount,
      now: new Date().toISOString(),
    })
    if (outcome === 'ignored') return
    if (outcome === 'duplicate') {
      setFeedback(t('guess.duplicate'))
      setAnnouncement(t('guess.duplicate'))
      return
    }
    roundRef.current = state
    onRoundChange(state)
    logEvent('guess_submitted', {
      ...base,
      revealedCount: state.revealedCount,
      mistakes: mistakeCount(state),
      result: outcome,
    })
    if (outcome === 'wrong' && state.status === 'active') {
      const message = tn('guess.wrong', mistakesLeft(state))
      setFeedback(message)
      setAnnouncement(message)
    } else {
      setFeedback('')
    }
    if (isFinal(state.status)) {
      logEvent('round_completed', {
        ...base,
        status: state.status,
        score: state.finalScore,
        revealedCount: state.revealedCount,
        mistakes: mistakeCount(state),
      })
    }
  }

  function confirmGiveUp() {
    setConfirmingGiveUp(false)
    const next = apply((s) => giveUp(s, new Date().toISOString()))
    if (next.status === 'gave_up') {
      logEvent('round_completed', {
        ...base,
        status: 'gave_up',
        score: 0,
        revealedCount: next.revealedCount,
        mistakes: mistakeCount(next),
      })
    }
  }

  const finished = isFinal(round.status)
  const visibleCount = Math.max(1, round.revealedCount)
  const clubName = labelFor(searchIndex, puzzle.clubId, lang)
  const possible = possibleScore(round)
  const afterReveal = scoreAfterNextReveal(round)
  const mistakes = mistakeCount(round)

  if (round.status === 'technical_error') {
    return (
      <section className="panel" role="alert">
        <h2>{t('round.loadFailed.title')}</h2>
        <p>{t('round.loadFailed.body')}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            apply(retryLoading)
            setLoadAttempt((n) => n + 1)
          }}
        >
          {t('round.retry')}
        </button>
      </section>
    )
  }

  return (
    <section className="round" aria-labelledby="round-heading">
      <div className="round-head">
        <h2 id="round-heading">{heading}</h2>
        {isTestPuzzle && <span className="badge">{t('dev.testPuzzle')}</span>}
      </div>

      <div className="stats">
        <p className="stat">
          {round.status === 'active' && possible !== null ? t('round.possible', { score: possible }) : ' '}
        </p>
        <p className="stat">
          {t('round.mistakes', { n: mistakes, max: GAME_CONFIG.maxMistakes })}{' '}
          <MistakePips used={mistakes} max={GAME_CONFIG.maxMistakes} />
        </p>
      </div>

      {finished && (
        <section className="panel result" aria-labelledby="result-title" data-status={round.status}>
          <h3 id="result-title">{t(`result.${round.status as 'solved' | 'failed' | 'gave_up'}`)}</h3>
          <p className="result-name">{t('result.answer', { name: clubName })}</p>
          <div className="crest-box">
            {crestFailed ? (
              <p role="alert">
                {t('result.crestFailed')}{' '}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCrestFailed(false)
                    setCrestAttempt((n) => n + 1)
                  }}
                >
                  {t('round.retry')}
                </button>
              </p>
            ) : (
              <img
                key={crestAttempt}
                className="crest"
                src={puzzle.crestUrl}
                alt={t('result.crestAlt', { name: clubName })}
                onError={() => setCrestFailed(true)}
              />
            )}
          </div>
          <ul className="result-facts">
            <li>{t('result.score', { score: round.finalScore ?? 0 })}</li>
            <li>{t('result.revealed', { k: visibleCount, n: round.totalReveals })}</li>
            <li>{t('result.mistakes', { n: mistakes })}</li>
          </ul>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {nextLabel}
          </button>
        </section>
      )}

      <section aria-labelledby="clues-title">
        <h3 id="clues-title" className="section-title">
          {t('round.cluesTitle')}
        </h3>
        <ol className="clue-grid" key={loadAttempt}>
          {puzzle.elements.slice(0, visibleCount).map((element, i) => (
            <ClueCard
              key={element.id}
              number={i + 1}
              element={element}
              onLoad={i === 0 ? onFirstLoaded : undefined}
              onError={i === 0 ? onFirstError : undefined}
              onZoom={setZoomed}
            />
          ))}
        </ol>
      </section>

      {!finished && (
        <section className="actions" aria-label={t('guess.button')}>
          <ClubSearch index={searchIndex} disabled={!canGuess(round)} onSubmit={guess} />
          {feedback && <p className="feedback">{feedback}</p>}
          <button
            type="button"
            className="btn btn-secondary btn-block"
            disabled={!canReveal(round)}
            onClick={reveal}
          >
            {round.pendingReveal
              ? t('reveal.loading')
              : afterReveal !== null
                ? t('reveal.button', { score: afterReveal })
                : t('reveal.allShown')}
          </button>
          {revealFailed && (
            <p className="feedback" role="alert">
              {t('reveal.failed')}
            </p>
          )}
          <button
            type="button"
            className="btn btn-link"
            disabled={round.status !== 'active'}
            onClick={() => setConfirmingGiveUp(true)}
          >
            {t('giveUp.button')}
          </button>
        </section>
      )}

      {round.guesses.some((g) => g.result === 'wrong') && (
        <section aria-labelledby="history-title">
          <h3 id="history-title" className="section-title">
            {t('guess.history')}
          </h3>
          <ul className="history">
            {round.guesses.map((g, i) => (
              <li key={`${g.clubId}-${i}`}>
                <span aria-hidden="true">{g.result === 'wrong' ? '✕' : '✓'}</span>{' '}
                {labelFor(searchIndex, g.clubId, lang)}
                {g.result === 'wrong' && <span className="sr-only"> · {t('guess.wrongMark')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      <ConfirmDialog
        open={confirmingGiveUp}
        title={t('giveUp.confirm')}
        confirmLabel={t('giveUp.yes')}
        onConfirm={confirmGiveUp}
        onCancel={() => setConfirmingGiveUp(false)}
      />

      <dialog
        ref={zoomRef}
        className="dialog dialog-zoom"
        aria-label={zoomed ? t('clue.zoomTitle', { n: zoomed }) : undefined}
        onCancel={() => setZoomed(null)}
        onClick={() => setZoomed(null)}
      >
        {zoomed !== null && puzzle.elements[zoomed - 1] && (
          <img src={puzzle.elements[zoomed - 1].url} alt={t('clue.alt', { n: zoomed })} className="zoom-img" />
        )}
        <button type="button" className="btn btn-secondary" onClick={() => setZoomed(null)}>
          {t('common.close')}
        </button>
      </dialog>
    </section>
  )
}
