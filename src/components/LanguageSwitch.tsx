import type { Lang } from '../domain/config.ts'
import { useI18n } from '../i18n/I18nContext.ts'

const LANGS: Lang[] = ['he', 'en']

export function LanguageSwitch() {
  const { t, lang, setLang } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={code === lang ? 'chip is-active' : 'chip'}
          aria-pressed={code === lang}
          onClick={() => setLang(code)}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  )
}
