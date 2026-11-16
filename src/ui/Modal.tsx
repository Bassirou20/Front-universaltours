// src/ui/Modal.tsx
import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  widthClass?: string
  /**
   * Demande confirmation avant de fermer (clic dehors, Échap, croix) si
   * l'utilisateur a saisi quelque chose dans la fenêtre. Activé par défaut.
   * Les boutons du contenu (« Annuler », « Enregistrer ») ne sont pas concernés :
   * ils appellent directement le parent.
   */
  guardUnsaved?: boolean
  children?: React.ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  widthClass = 'max-w-2xl',
  guardUnsaved = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // true dès que l'utilisateur modifie un champ de la fenêtre
  const dirtyRef = useRef(false)
  const [askClose, setAskClose] = useState(false)

  // Toujours la dernière version des callbacks, sans ré-abonner les listeners
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const requestClose = () => {
    if (guardUnsaved && dirtyRef.current) setAskClose(true)
    else onCloseRef.current()
  }
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose
  const askCloseRef = useRef(askClose)
  askCloseRef.current = askClose

  // Ouverture : réinitialise l'état, verrouille le scroll, mémorise le focus
  useEffect(() => {
    if (!open) return
    dirtyRef.current = false
    setAskClose(false)

    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      // Rend le focus à l'élément qui a ouvert la fenêtre
      previouslyFocused?.focus?.()
    }
  }, [open])

  // Clavier : Échap + focus retenu dans la fenêtre (Tab / Maj+Tab)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current
      if (!panel) return
      // Une autre fenêtre ouverte par-dessus a le focus : on la laisse gérer.
      const active = document.activeElement
      const inOtherDialog =
        active instanceof HTMLElement && !panel.contains(active) && !!active.closest('[role="dialog"]')
      if (inOtherDialog) return

      if (e.key === 'Escape') {
        if (askCloseRef.current) setAskClose(false)
        else requestCloseRef.current()
        return
      }

      if (e.key !== 'Tab') return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const markDirty = () => {
    dirtyRef.current = true
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onMouseDown={(e) => {
        // click dehors ferme (avec confirmation si une saisie est en cours)
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          'relative w-full',
          widthClass,
          'rounded-2xl bg-white dark:bg-panel shadow-lg',
          'border border-black/5 dark:border-white/10',
          'max-h-[90vh] overflow-hidden focus:outline-none',
        ].join(' ')}
        onMouseDown={(e) => e.stopPropagation()}
        onInputCapture={markDirty}
        onChangeCapture={markDirty}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
          <h3 id={titleId} className="text-base font-semibold truncate">{title}</h3>
          <button
            type="button"
            className="btn px-2 bg-gray-100 dark:bg-white/10"
            onClick={requestClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">{children}</div>

        {/* Confirmation avant de perdre une saisie en cours */}
        {askClose && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60 backdrop-blur-[2px] p-4"
            role="alertdialog"
            aria-label="Fermer sans enregistrer ?"
          >
            <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#151d2e] p-5 text-center shadow-xl">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Fermer sans enregistrer ?
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Les informations saisies seront perdues.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  autoFocus
                  className="flex-1 btn bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15"
                  onClick={() => setAskClose(false)}
                >
                  Continuer la saisie
                </button>
                <button
                  type="button"
                  className="flex-1 btn bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onCloseRef.current()}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

export default Modal
