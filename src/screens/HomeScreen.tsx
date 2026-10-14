import type { ActiveContent } from '../content/load.ts'
import { useI18n } from '../i18n/I18nContext.ts'

interface Props {
  content: ActiveContent
  go: (route: 'practice' | 'how-to' | 'settings') => void
}

export function HomeScreen({ content, go }: Props) {
  const { t } = useI18n()
  const hasPuzzles = content.repo.publishedPuzzles().length > 0
  return (
    <section className="home">
      <h2 className="tagline">{t('home.tagline')}</h2>

      {!hasPuzzles && (
        <p className="notice" role="status">
          <strong>{t('content.empty.title')}.</strong> {t('content.empty.body')}
        </p>
      )}

      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => go('practice')} disabled={!hasPuzzles}>
        {t('home.practice')}
      </button>

      {/* The daily challenge needs a frozen daily schedule (milestone 4); none exists yet. */}
      <div className="panel daily-card" aria-labelledby="daily-title">
        <h3 id="daily-title">{t('home.daily.title')}</h3>
        <p className="muted">{t('home.daily.unavailable')}</p>
      </div>

      <nav className="link-row" aria-label={t('app.name')}>
        <button type="button" className="btn btn-link" onClick={() => go('how-to')}>
          {t('home.howTo')}
        </button>
        <button type="button" className="btn btn-link" onClick={() => go('settings')}>
          {t('home.settings')}
        </button>
      </nav>
    </section>
  )
}
