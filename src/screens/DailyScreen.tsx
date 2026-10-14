import { useCallback, useEffect, useRef, useState } from 'react'
import { nowIso, nowMs } from '../clock.ts'
import { RoundView } from '../components/RoundView.tsx'
import type { ActiveContent } from '../content/load.ts'
import type { DailyChallenge } from '../content/schemas.ts'
import { DAILY_MAX_SCORE } from '../domain/daily.ts'
import { gameDateUtc } from '../domain/dates.ts'
import { restoreRound, type RoundState } from '../domain/round.ts'
import { useDailyLock } from '../hooks/useDailyLock.ts'
import { useNow } from '../hooks/useNow.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import { logEvent } from '../storage/eventLog.ts'
import { getStorage, storageKey } from '../storage/safeStorage.ts'
import type { DailyProgress } from '../storage/schemas.ts'
import { loadDaily, saveDaily } from '../storage/stores.ts'
import { DailySummary } from './DailySummary.tsx'
import {
  advanceDaily,
  applyDailyRoundUpdate,
  canRestoreDaily,
  dailyProgressTotals,
  isDailyComplete,
  startDaily,
} from './dailySession.ts'

type View =
  | { kind: 'blocked'; reason: 'storage' | 'unavailable' | 'past' | 'future' }
  | { kind: 'problem'; reason: 'corrupt' | 'restore' }
  | { kind: 'intro'; entry: DailyChallenge }
  | { kind: 'play'; progress: DailyProgress }

/**
 * What can be shown for a game date: a stored challenge (resumed, even from an earlier day),
 * the intro for today's scheduled challenge, or a reason it cannot be played. A challenge that
 * was never started cannot be started once its day has passed, and nothing is invented when
 * the schedule has no valid entry.
 */
function resolveView(content: ActiveContent, date: string): View {
  if (getStorage() === null) return { kind: 'blocked', reason: 'storage' }
  const stored = loadDaily(date)
  if (stored.kind === 'corrupt') return { kind: 'problem', reason: 'corrupt' }
  if (stored.kind === 'ok') {
    if (!canRestoreDaily(stored.value, content.repo)) return { kind: 'problem', reason: 'restore' }
    const { activeRound } = stored.value
    return { kind: 'play', progress: { ...stored.value, activeRound: activeRound && restoreRound(activeRound) } }
  }
  const today = gameDateUtc(nowMs())
  if (date < today) return { kind: 'blocked', reason: 'past' }
  if (date > today) return { kind: 'blocked', reason: 'future' }
  const entry = content.repo.getValidDaily(date)
  return entry ? { kind: 'intro', entry } : { kind: 'blocked', reason: 'unavailable' }
}

interface Props {
  content: ActiveContent
  date: string
  onHome: () => void
  onPractice: () => void
}

export function DailyScreen({ content, date, onHome, onPractice }: Props) {
  const { t } = useI18n()
  const { repo, searchIndex } = content
  const [view, setView] = useState<View>(() => resolveView(content, date))
  const [saveOk, setSaveOk] = useState(true)
  const now = useNow(30_000)

  const needsLock = view.kind === 'intro' || (view.kind === 'play' && !isDailyComplete(view.progress))
  const writerRef = useRef(false)
  const viewRef = useRef(view)

  const refresh = useCallback(() => {
    const next = resolveView(content, date)
    viewRef.current = next
    setView(next)
  }, [content, date])

  const { writer, takeOver } = useDailyLock(date, needsLock, refresh)

  // A read-only tab follows the writer's saved progress.
  useEffect(() => {
    writerRef.current = writer
  }, [writer])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!writerRef.current && event.key === storageKey(`daily:${date}`)) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [date, refresh])

  const commit = useCallback((next: DailyProgress) => {
    if (!writerRef.current) return
    const wasComplete = viewRef.current.kind === 'play' && isDailyComplete(viewRef.current.progress)
    const nextView: View = { kind: 'play', progress: next }
    viewRef.current = nextView
    setView(nextView)
    setSaveOk(saveDaily(next))
    if (isDailyComplete(next) && !wasComplete) {
      const totals = dailyProgressTotals(next)
      logEvent('daily_completed', {
        dailyId: next.dailyId,
        date: next.dateUtc,
        score: totals.score,
        solved: totals.solved,
      })
    }
  }, [])

  const onRoundChange = useCallback(
    (round: RoundState) => {
      const current = viewRef.current
      if (current.kind !== 'play') return
      const ref = current.progress.puzzleRefs[current.progress.currentRoundIndex]
      const clubId = ref ? repo.getPuzzle(ref)?.clubId : undefined
      if (clubId) commit(applyDailyRoundUpdate(current.progress, round, clubId))
    },
    [repo, commit],
  )

  const header = (
    <>
      <h2>{t('daily.title')}</h2>
      <p className="muted">{t('daily.dateLabel', { date })}</p>
    </>
  )

  if (view.kind === 'blocked') {
    return (
      <section className="panel" role={view.reason === 'storage' ? 'alert' : undefined}>
        {header}
        <p>
          {view.reason === 'storage' && t('daily.needsStorage')}
          {view.reason === 'unavailable' && t('home.daily.unavailable')}
          {view.reason === 'past' && t('daily.unavailable.past')}
          {view.reason === 'future' && t('daily.unavailable.future')}
        </p>
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={onPractice}>
            {t('home.practice')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onHome}>
            {t('nav.home')}
          </button>
        </div>
      </section>
    )
  }

  if (view.kind === 'problem') {
    return (
      <section className="panel" role="alert">
        {header}
        <p>{t(`daily.problem.${view.reason}`)}</p>
        <button type="button" className="btn btn-secondary" onClick={onHome}>
          {t('nav.home')}
        </button>
      </section>
    )
  }

  const readOnlyNotice = !writer && needsLock && (
    <div className="notice" role="status">
      <p>{t('daily.lock.readOnly')}</p>
      <button type="button" className="btn btn-secondary" onClick={takeOver}>
        {t('daily.lock.takeOver')}
      </button>
    </div>
  )
  const saveNotice = !saveOk && (
    <p className="notice" role="status">
      {t('storage.saveFailed')}
    </p>
  )
  const olderNotice = date < gameDateUtc(now) && (
    <p className="notice" role="status">
      {t('daily.older.note', { date })}
    </p>
  )

  if (view.kind === 'intro') {
    return (
      <>
        {readOnlyNotice}
        <section className="panel">
          {header}
          <p>{t('daily.intro.body', { max: DAILY_MAX_SCORE })}</p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!writer}
            onClick={() => {
              const started = startDaily(view.entry, repo, nowIso())
              if (started) commit(started)
            }}
          >
            {t('daily.start')}
          </button>
        </section>
      </>
    )
  }

  const { progress } = view
  if (isDailyComplete(progress)) {
    return (
      <>
        {olderNotice}
        <DailySummary progress={progress} searchIndex={searchIndex} onHome={onHome} onPractice={onPractice} />
      </>
    )
  }

  const ref = progress.puzzleRefs[progress.currentRoundIndex]
  const playable = ref ? repo.getPlayablePuzzle(ref) : null
  if (!playable || !progress.activeRound) {
    return (
      <section className="panel" role="alert">
        {header}
        <p>{t('daily.problem.restore')}</p>
        <button type="button" className="btn btn-secondary" onClick={onHome}>
          {t('nav.home')}
        </button>
      </section>
    )
  }

  const isLast = progress.currentRoundIndex + 1 >= progress.puzzleRefs.length
  return (
    <>
      {olderNotice}
      {readOnlyNotice}
      {saveNotice}
      <RoundView
        key={progress.activeRound.roundId}
        puzzle={playable}
        round={progress.activeRound}
        onRoundChange={onRoundChange}
        searchIndex={searchIndex}
        heading={t('daily.puzzleOf', { n: progress.currentRoundIndex + 1, total: progress.puzzleRefs.length })}
        isTestPuzzle={repo.kind === 'fixture'}
        nextLabel={isLast ? t('daily.toSummary') : t('result.next')}
        onNext={() => commit(advanceDaily(progress, repo, nowIso()))}
        readOnly={!writer}
      />
    </>
  )
}
