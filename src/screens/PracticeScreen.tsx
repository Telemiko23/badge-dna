import { useCallback, useRef, useState } from 'react'
import { RoundView } from '../components/RoundView.tsx'
import type { ActiveContent } from '../content/load.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import type { RoundState } from '../domain/round.ts'
import { archivePractice, loadPractice, savePractice } from '../storage/stores.ts'
import { getStorage } from '../storage/safeStorage.ts'
import type { PracticeProgress } from '../storage/schemas.ts'
import {
  advance,
  applyRoundUpdate,
  canRestore,
  isExhausted,
  newSession,
  startNewCycle,
} from './practiceSession.ts'

type Init =
  | { kind: 'ready'; session: PracticeProgress }
  | { kind: 'restore-problem' }
  | { kind: 'empty' }

function initialise(content: ActiveContent): Init {
  const stored = loadPractice()
  const now = new Date().toISOString()
  if (stored.kind === 'ok') {
    if (canRestore(stored.value, content.repo)) return { kind: 'ready', session: stored.value }
    return { kind: 'restore-problem' }
  }
  if (stored.kind === 'corrupt') return { kind: 'restore-problem' }
  const session = newSession(content.repo, now)
  return session ? { kind: 'ready', session } : { kind: 'empty' }
}

export function PracticeScreen({ content, onHome }: { content: ActiveContent; onHome: () => void }) {
  const { t } = useI18n()
  const [init, setInit] = useState<Init>(() => initialise(content))

  if (init.kind === 'empty') {
    return (
      <section className="panel">
        <h2>{t('content.empty.title')}</h2>
        <p>{t('content.empty.body')}</p>
        <button type="button" className="btn btn-secondary" onClick={onHome}>
          {t('nav.home')}
        </button>
      </section>
    )
  }

  if (init.kind === 'restore-problem') {
    return (
      <section className="panel" role="alert">
        <h2>{t('practice.restore.title')}</h2>
        <p>{t('practice.restore.body')}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            archivePractice()
            const session = newSession(content.repo, new Date().toISOString())
            setInit(session ? { kind: 'ready', session } : { kind: 'empty' })
          }}
        >
          {t('practice.restore.startNew')}
        </button>
      </section>
    )
  }

  return <PracticeSession initial={init.session} content={content} onHome={onHome} />
}

function PracticeSession({
  initial,
  content,
  onHome,
}: {
  initial: PracticeProgress
  content: ActiveContent
  onHome: () => void
}) {
  const { t } = useI18n()
  const { repo, searchIndex } = content
  const [session, setSession] = useState(initial)
  const [saveOk, setSaveOk] = useState(() => savePractice(initial))
  const sessionRef = useRef(session)

  /** Every change goes through here so it is persisted at the moment it happens. */
  const commit = useCallback((next: PracticeProgress) => {
    sessionRef.current = next
    setSession(next)
    setSaveOk(savePractice(next))
  }, [])

  const ref = session.order[session.position]
  const playable = ref ? repo.getPlayablePuzzle(ref) : null

  const onRoundChange = useCallback(
    (next: RoundState) => {
      const current = sessionRef.current
      const puzzle = current.order[current.position]
      const club = puzzle ? repo.getPuzzle(puzzle)?.clubId : undefined
      if (!club) return
      commit(applyRoundUpdate(current, next, club))
    },
    [repo, commit],
  )

  const solved = session.results.filter((r) => r.status === 'solved').length
  const summary = t('practice.summary', { attempts: session.results.length, solved })

  const banner = !saveOk && (
    <p className="notice" role="status">
      {getStorage() === null ? t('storage.unavailable') : t('storage.saveFailed')}
    </p>
  )

  if (isExhausted(session)) {
    return (
      <>
        {banner}
        <section className="panel">
          <h2>{t('practice.exhausted.title')}</h2>
          <p>{t('practice.exhausted.body')}</p>
          <p className="muted">{summary}</p>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const next = startNewCycle(session, repo, new Date().toISOString())
                if (next) commit(next)
              }}
            >
              {t('practice.newCycle')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onHome}>
              {t('nav.home')}
            </button>
          </div>
        </section>
      </>
    )
  }

  if (!playable || !session.activeRound) {
    return (
      <section className="panel" role="alert">
        <h2>{t('round.loadFailed.title')}</h2>
        <button type="button" className="btn btn-secondary" onClick={onHome}>
          {t('nav.home')}
        </button>
      </section>
    )
  }

  const isLast = session.position + 1 >= session.order.length
  return (
    <>
      {banner}
      <RoundView
        key={session.activeRound.roundId}
        puzzle={playable}
        round={session.activeRound}
        onRoundChange={onRoundChange}
        searchIndex={searchIndex}
        heading={t('practice.puzzleOf', { n: session.position + 1, total: session.order.length })}
        isTestPuzzle={repo.kind === 'fixture'}
        nextLabel={isLast ? t('practice.finish') : t('result.next')}
        onNext={() => commit(advance(session, repo, new Date().toISOString()))}
      />
      <p className="muted summary">{summary}</p>
    </>
  )
}
