import { createContext, useContext } from 'react'
import type { Lang } from '../domain/config.ts'
import type { MessageKey } from './he.ts'

export type Params = Record<string, string | number>

export interface I18n {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (lang: Lang) => void
  t: (key: MessageKey, params?: Params) => string
  /** Picks `${key}.one` for 1 and `${key}.other` otherwise; `{n}` is filled in. */
  tn: (key: 'guess.wrong', n: number) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
