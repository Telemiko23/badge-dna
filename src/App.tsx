import { useEffect, useState } from 'react'
import { LanguageSwitch } from './components/LanguageSwitch.tsx'
import { loadContent, selectActiveContent, type ActiveContent } from './content/load.ts'
import { ContentError } from './content/repository.ts'
import { useI18n } from './i18n/I18nContext.ts'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { HowToScreen } from './screens/HowToScreen.tsx'
import { PracticeScreen } from './screens/PracticeScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { logEvent } from './storage/eventLog.ts'

type Route = 'home' | 'practice' | 'how-to' | 'settings'
const ROUTES: Route[] = ['home', 'practice', 'how-to', 'settings']

function routeFromHash(): Route {
  const name = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(name) ? name : 'home'
}

function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(routeFromHash)
  useEffect(() => {
    const onChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return [route, (next) => { window.location.hash = next === 'home' ? '#/' : `#/${next}` }]
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

  return (
    <div className="app">
      {state.kind === 'ready' && state.content.mode === 'fixture' && (
        <p className="dev-banner" role="note">
          {t('dev.banner')}
        </p>
      )}
      <header className="app-header">
        <h1>
          <a href="#/" className="brand">
            {t('app.name')}
          </a>
        </h1>
        <LanguageSwitch />
      </header>

      <main className="app-main">
        {route !== 'home' && (
          <button type="button" className="btn btn-link back" onClick={() => go('home')}>
            ← {t('nav.back')}
          </button>
        )}
        {state.kind === 'loading' && <p className="muted" role="status">{t('clue.loading')}</p>}
        {state.kind === 'error' && (
          <section className="panel" role="alert">
            <h2>{t('content.error.title')}</h2>
            <p>{state.message}</p>
            {import.meta.env.DEV && state.details.length > 0 && (
              <ul>{state.details.map((d) => <li key={d}>{d}</li>)}</ul>
            )}
          </section>
        )}
        {state.kind === 'ready' && (
          <>
            {route === 'home' && <HomeScreen content={state.content} go={go} />}
            {route === 'practice' && <PracticeScreen content={state.content} onHome={() => go('home')} />}
            {route === 'how-to' && <HowToScreen />}
            {route === 'settings' && <SettingsScreen />}
          </>
        )}
        {route === 'how-to' && state.kind !== 'ready' && <HowToScreen />}
        {route === 'settings' && state.kind !== 'ready' && <SettingsScreen />}
      </main>
    </div>
  )
}
