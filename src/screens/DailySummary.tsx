import { useRef, useState } from 'react'
import { DAILY_MAX_SCORE } from '../domain/daily.ts'
import { nextRolloverMs, timeLeft } from '../domain/dates.ts'
import { labelFor, type SearchIndex } from '../domain/search.ts'
import { useNow } from '../hooks/useNow.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import type { DailyProgress } from '../storage/schemas.ts'
import { dailyProgressTotals, shareText } from './dailySession.ts'

interface Props {
  progress: DailyProgress
  searchIndex: SearchIndex
  onHome: () => void
  onPractice: () => void
}

/** Personal summary (club names are fine here); the shared text carries no answers. */
export function DailySummary({ progress, searchIndex, onHome, onPractice }: Props) {
  const { t, lang } = useI18n()
  const now = useNow(30_000)
  const totals = dailyProgressTotals(progress)
  const text = shareText(progress, t)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const manualRef = useRef<HTMLTextAreaElement>(null)

  const left = timeLeft(now)
  const when = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(
    nextRolloverMs(now),
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
      // Let the player copy by hand.
      setTimeout(() => manualRef.current?.select(), 0)
    }
  }

  return (
    <section className="panel" aria-labelledby="daily-summary-title">
      <h2 id="daily-summary-title">{t('daily.summary.title')}</h2>
      <p className="muted">{t('daily.dateLabel', { date: progress.dateUtc })}</p>
      <p className="summary-score">{t('daily.summary.score', { score: totals.score, max: DAILY_MAX_SCORE })}</p>
      <p>{t('daily.summary.solved', { solved: totals.solved, total: progress.puzzleRefs.length })}</p>

      <ol className="summary-rounds">
        {progress.results.map((r, i) => (
          <li key={r.roundId}>
            <strong>{t('daily.summary.round', { n: i + 1 })}</strong>
            {' · '}
            {t(`status.${r.status}`)}
            {' · '}
            {labelFor(searchIndex, r.clubId, lang)}
            {' · '}
            {r.score}
            {' · '}
            <span className="muted">{t('daily.summary.clues', { k: r.revealedCount, n: r.totalReveals })}</span>
          </li>
        ))}
      </ol>

      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={copy}>
          {t('daily.copy')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onPractice}>
          {t('home.practice')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onHome}>
          {t('nav.home')}
        </button>
      </div>

      <p role="status" className="muted">
        {copyState === 'copied' && t('daily.copied')}
        {copyState === 'failed' && t('daily.copyFailed')}
      </p>
      {copyState === 'failed' && (
        <textarea ref={manualRef} className="share-box" readOnly value={text} rows={4} aria-label={t('daily.copy')} />
      )}

      <p className="muted">
        {t('daily.summary.nextIn', { h: left.hours, m: String(left.minutes).padStart(2, '0') })} · {t('daily.summary.nextAt', { when })}
      </p>
    </section>
  )
}
