import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../domain/config.ts'
import { loadLang, saveLang } from '../storage/stores.ts'
import { en } from './en.ts'
import { he, type MessageKey } from './he.ts'
import { I18nContext, type I18n, type Params } from './I18nContext.ts'

const dictionaries: Record<Lang, Record<MessageKey, string>> = { he, en }

function format(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang())
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    saveLang(next)
  }, [])

  const value = useMemo<I18n>(() => {
    const t = (key: MessageKey, params?: Params) => format(dictionaries[lang][key], params)
    return {
      lang,
      dir,
      setLang,
      t,
      tn: (key, n) => t(`${key}.${n === 1 ? 'one' : 'other'}` as MessageKey, { n }),
    }
  }, [lang, dir, setLang])

  return <I18nContext value={value}>{children}</I18nContext>
}
