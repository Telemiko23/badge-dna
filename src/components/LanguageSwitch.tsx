import type { ChangeEvent } from 'react'
import { LANGS, type Lang } from '../domain/config.ts'
import { useI18n } from '../i18n/I18nContext.ts'
import { IconChevron, IconGlobe } from './icons.tsx'

/**
 * Language dropdown. A native <select>: accessible, keyboard-friendly and it opens the
 * platform picker on phones. Its size does not depend on the language, so it never shifts.
 */
export function LanguageSwitch() {
  const { t, lang, setLang } = useI18n()
  return (
    <label className="lang-select">
      <span className="sr-only">{t('lang.label')}</span>
      <IconGlobe />
      <select
        value={lang}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setLang(e.target.value as Lang)}
        aria-label={t('lang.label')}
      >
        {LANGS.map((code) => (
          <option key={code} value={code} lang={code}>
            {t(`lang.${code}`)}
          </option>
        ))}
      </select>
      <IconChevron />
    </label>
  )
}
