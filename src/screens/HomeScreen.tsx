import { useMemo } from 'react'
import type { ActiveContent } from '../content/load.ts'
import { DAILY_MAX_SCORE } from '../domain/daily.ts'
import { useNow } from '../hooks/useNow.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import type { Route } from '../routes.ts'
import { getDailyStatus, type DailyCardState } from './dailyStatus.ts'

interface Props {
  content: ActiveContent
  go: (route: Route) => void
}

export function HomeScreen({ content, go }: Props) {
  const { t } = useI18n()
  const hasPuzzles = content.repo.publishedPuzzles().length > 0
  // Re-evaluated every 30 s so the cards follow the 00:00 UTC rollover without a reload.
  const now = useNow(30_000)
  const minute = Math.floor(now / 60_000)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when the minute changes
  const status = useMemo(() => getDailyStatus(content.repo, now), [content.repo, minute])

  return (
    <section className="home">
      <h2 className="tagline">{t('home.tagline')}</h2>

      {!hasPuzzles && (
        <p className="notice" role="status">
          <strong>{t('content.empty.title')}.</strong> {t('content.empty.body')}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block btn-lg"
        onClick={() => go({ name: 'practice' })}
        disabled={!hasPuzzles}
      >
        {t('home.practice')}
      </button>

      {status.older && (
        <div className="panel daily-card" aria-labelledby="daily-older-title">
          <h3 id="daily-older-title">{t('daily.older.title', { date: status.older.date })}</h3>
          <p className="muted">
            {t('daily.card.inProgress', { n: status.older.index, total: status.older.total })}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => go({ name: 'daily', date: status.older!.date })}
          >
            {t('daily.continue')}
          </button>
        </div>
      )}

      <DailyCard state={status.today} go={go} />

      <nav className="link-row" aria-label={t('app.name')}>
        <button type="button" className="btn btn-link" onClick={() => go({ name: 'how-to' })}>
          {t('home.howTo')}
        </button>
        <button type="button" className="btn btn-link" onClick={() => go({ name: 'settings' })}>
          {t('home.settings')}
        </button>
      </nav>
    </section>
  )
}

function DailyCard({ state, go }: { state: DailyCardState; go: (route: Route) => void }) {
  const { t } = useI18n()
  const open = (date: string) => go({ name: 'daily', date })
  return (
    <div className="panel daily-card" aria-labelledby="daily-title">
      <h3 id="daily-title">{t('daily.title')}</h3>
      {state.kind === 'storage-unavailable' && <p className="muted">{t('daily.card.needsStorage')}</p>}
      {state.kind === 'unavailable' && <p className="muted">{t('home.daily.unavailable')}</p>}
      {state.kind === 'problem' && <p className="muted">{t('daily.card.problem', { date: state.date })}</p>}
      {state.kind === 'not-started' && (
        <>
          <p className="muted">{t('daily.card.notStarted', { max: DAILY_MAX_SCORE })}</p>
          <button type="button" className="btn btn-primary" onClick={() => open(state.date)}>
            {t('daily.start')}
          </button>
        </>
      )}
      {state.kind === 'in-progress' && (
        <>
          <p className="muted">{t('daily.card.inProgress', { n: state.index, total: state.total })}</p>
          <button type="button" className="btn btn-primary" onClick={() => open(state.date)}>
            {t('daily.continue')}
          </button>
        </>
      )}
      {state.kind === 'completed' && (
        <>
          <p className="muted">{t('daily.card.completed', { score: state.score, max: DAILY_MAX_SCORE })}</p>
          <button type="button" className="btn btn-secondary" onClick={() => open(state.date)}>
            {t('daily.viewResult')}
          </button>
        </>
      )}
    </div>
  )
}
