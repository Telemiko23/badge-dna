import { useI18n } from '../i18n/I18nContext.ts'
import { LEGAL } from '../legal.ts'

export function LegalScreen() {
  const { t } = useI18n()
  return (
    <section className="panel legal">
      <h2>{t('legal.title')}</h2>
      <p>{t('legal.independent')}</p>
      <p>{t('legal.trademarks')}</p>
      <p>{t('legal.assets')}</p>
      <p>{t('legal.privacy')}</p>
      <p>
        {t('legal.takedown')}
        {LEGAL.contactEmail && (
          <>
            {' '}
            <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
          </>
        )}
      </p>
    </section>
  )
}
