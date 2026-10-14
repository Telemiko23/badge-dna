import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { GAME_CONFIG } from '../domain/config.ts'
import { normalizeSearch, searchClubs, type ClubSuggestion, type SearchIndex } from '../domain/search.ts'
import { useI18n } from '../i18n/I18nContext.ts'

interface Props {
  index: SearchIndex
  disabled: boolean
  onSubmit: (clubId: string) => void
}

/** Accessible combobox (WAI-ARIA list autocomplete). Choosing a suggestion never submits by itself. */
export function ClubSearch({ index, disabled, onSubmit }: Props) {
  const { t, lang } = useI18n()
  const uid = useId()
  const listId = `${uid}-list`
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ClubSuggestion | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const suggestions = useMemo(() => searchClubs(index, query, lang), [index, query, lang])
  const longEnough = normalizeSearch(query).length >= GAME_CONFIG.search.minChars
  const showList = open && !selected && longEnough && !disabled
  const activeId = showList && suggestions[active] ? `${uid}-opt-${active}` : undefined

  function choose(suggestion: ClubSuggestion) {
    setSelected(suggestion)
    setQuery(suggestion.label)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!showList) setOpen(true)
      else setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && showList && suggestions[active]) {
      e.preventDefault() // selects the suggestion; a second Enter submits
      choose(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <form
      className="guess-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!selected || disabled) return
        onSubmit(selected.clubId)
        setQuery('')
        setSelected(null)
        setOpen(false)
      }}
    >
      <label htmlFor={`${uid}-input`} className="field-label">
        {t('guess.label')}
      </label>
      <div className="guess-row">
        <input
          id={`${uid}-input`}
          className="input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t('guess.placeholder')}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
            setOpen(true)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || !selected}>
          {t('guess.button')}
        </button>
      </div>
      {showList && (
        <ul id={listId} role="listbox" aria-label={t('guess.suggestions')} className="suggestions">
          {suggestions.map((s, i) => (
            <li
              key={s.clubId}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'suggestion is-active' : 'suggestion'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {showList && suggestions.length === 0 && (
        <p className="muted" role="status">
          {t('guess.noResults')}
        </p>
      )}
      {!selected && !showList && !disabled && <p className="muted hint">{t('guess.pickHint')}</p>}
    </form>
  )
}
