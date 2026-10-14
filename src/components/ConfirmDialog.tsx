import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext.ts'

interface Props {
  open: boolean
  title: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Native modal dialog: focus trapping, Esc to cancel and inert background come for free. */
export function ConfirmDialog({ open, title, confirmLabel, onConfirm, onCancel }: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); onCancel() }} aria-labelledby="confirm-title">
      <p id="confirm-title" className="dialog-title">{title}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} autoFocus>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
