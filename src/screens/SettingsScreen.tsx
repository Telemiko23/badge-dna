import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LanguageSwitch } from '../components/LanguageSwitch.tsx'
import { useI18n } from '../i18n/I18nContext.ts'
import { exportEvents } from '../storage/eventLog.ts'
import { clearAllLocalData } from '../storage/safeStorage.ts'

export function SettingsScreen() {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  function downloadEvents() {
    const url = URL.createObjectURL(new Blob([exportEvents()], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'badge-dna-events.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel">
      <h2>{t('settings.title')}</h2>

      <h3 className="section-title">{t('lang.label')}</h3>
      <LanguageSwitch />

      <h3 className="section-title">{t('settings.reset')}</h3>
      <p className="muted">{t('settings.resetHelp')}</p>
      <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
        {t('settings.reset')}
      </button>
      {done && (
        <p role="status" className="notice">
          {t('settings.resetDone')}
        </p>
      )}

      {import.meta.env.DEV && (
        <>
          <h3 className="section-title">{t('review.title')}</h3>
          <a className="btn btn-secondary" href="#/review">
            {t('settings.reviewLink')}
          </a>
          <h3 className="section-title">{t('settings.exportEvents')}</h3>
          <button type="button" className="btn btn-secondary" onClick={downloadEvents}>
            {t('settings.exportEvents')}
          </button>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('settings.resetConfirm')}
        confirmLabel={t('settings.resetYes')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          clearAllLocalData()
          setConfirming(false)
          setDone(true)
        }}
      />
    </section>
  )
}
