import { useEffect, useState } from 'react'
import { IconHome, LogoMark } from './components/icons.tsx'
import { LanguageSwitch } from './components/LanguageSwitch.tsx'
import { loadContent, selectActiveContent, type ActiveContent } from './content/load.ts'
import { ContentError } from './content/repository.ts'
import { useI18n } from './i18n/I18nContext.ts'
import { parseRoute, routeHash, type Route } from './routes.ts'
import { DailyScreen } from './screens/DailyScreen.tsx'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { HowToScreen } from './screens/HowToScreen.tsx'
import { PracticeScreen } from './screens/PracticeScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { logEvent } from './storage/eventLog.ts'

function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return [
    route,
    (next) => {
      window.location.hash = routeHash(next)
    },
  ]
}

type ContentState =
  | { kind: 'loading' }
  | { kind: 'ready'; content: ActiveContent }
  | { kind: 'error'; message: string; details: string[] }

export default function App() {
  const { t } = useI18n()
  const [route, go] = useRoute()
  const [state, setState] = useState<ContentState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadContent()
      .then((bundle) => !cancelled && setState({ kind: 'ready', content: selectActiveContent(bundle) }))
      .catch((error: unknown) => {
        logEvent('content_error', { where: 'load' })
        if (cancelled) return
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof ContentError ? error.details : [],
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const home = () => go({ name: 'home' })
  const practice = () => go({ name: 'practice' })

  return (
    <div className="app">
      {state.kind === 'ready' && state.content.mode === 'fixture' && (
        <p className="dev-banner" role="note">
          {t('dev.banner')}
        </p>
      )}
      {/* Fixed physical layout (see .app-header): nothing here moves when the language flips direction. */}
      <header className="app-header">
        <LanguageSwitch />
        <h1 className="brand">
          <a href="#/" aria-label={t('nav.home')}>
            <LogoMark />
            <span>{t('app.name')}</span>
          </a>
        </h1>
        <button
          type="button"
          className="icon-btn"
          onClick={home}
          aria-label={t('nav.home')}
          title={t('nav.home')}
          hidden={route.name === 'home'}
        >
          <IconHome />
        </button>
        {route.name === 'home' && <span className="header-spacer" aria-hidden="true" />}
      </header>

      <main className="app-main">
        {state.kind === 'loading' && (
          <p className="muted" role="status">
            {t('clue.loading')}
          </p>
        )}
        {state.kind === 'error' && (
          <section className="panel" role="alert">
            <h2>{t('content.error.title')}</h2>
            <p>{state.message}</p>
            {import.meta.env.DEV && state.details.length > 0 && (
              <ul>
                {state.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </section>
        )}
        {state.kind === 'ready' && (
          <>
            {route.name === 'home' && <HomeScreen content={state.content} go={go} />}
            {route.name === 'practice' && <PracticeScreen content={state.content} onHome={home} />}
            {route.name === 'daily' && (
              <DailyScreen
                key={route.date}
                content={state.content}
                date={route.date}
                onHome={home}
                onPractice={practice}
              />
            )}
          </>
        )}
        {route.name === 'how-to' && <HowToScreen />}
        {route.name === 'settings' && <SettingsScreen />}
      </main>
    </div>
  )
}
