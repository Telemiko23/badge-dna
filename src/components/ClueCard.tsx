import { useState } from 'react'
import type { PlayableElement } from '../content/repository.ts'
import { useI18n } from '../i18n/I18nContext.ts'

interface Props {
  number: number
  element: PlayableElement
  onLoad?: () => void
  onError?: () => void
  onZoom?: (number: number) => void
}

/**
 * One revealed element. Shows the clue number and the image only; the alt text is
 * deliberately neutral so nothing reveals the club to assistive technology.
 */
export function ClueCard({ number, element, onLoad, onError, onZoom }: Props) {
  const { t } = useI18n()
  const [loaded, setLoaded] = useState(false)
  return (
    <li className="clue-card" data-testid="clue-card">
      <p className="clue-label">{t('clue.label', { n: number })}</p>
      <button
        type="button"
        className="clue-media"
        onClick={() => onZoom?.(number)}
        disabled={!loaded}
        aria-label={`${t('clue.zoom')} · ${t('clue.label', { n: number })}`}
      >
        <img
          src={element.url}
          width={element.width}
          height={element.height}
          alt={t('clue.alt', { n: number })}
          className={loaded ? 'is-loaded' : undefined}
          onLoad={() => {
            setLoaded(true)
            onLoad?.()
          }}
          onError={() => onError?.()}
          draggable={false}
        />
        {!loaded && <span className="clue-placeholder" aria-hidden="true">{t('clue.loading')}</span>}
      </button>
    </li>
  )
}
