import { useI18n } from '../i18n/I18nContext.ts'

export function HowToScreen() {
  const { t } = useI18n()
  return (
    <section className="panel">
      <h2>{t('howTo.title')}</h2>
      <ol className="how-to">
        <li>{t('howTo.1')}</li>
        <li>{t('howTo.2')}</li>
        <li>{t('howTo.3')}</li>
        <li>{t('howTo.4')}</li>
      </ol>
    </section>
  )
}
