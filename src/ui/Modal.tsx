// src/ui/Modal.tsx
import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  widthClass?: string
  children?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  widthClass = 'max-w-2xl',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  // Lock scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Focus
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
  }, [open])

  if (!open) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click dehors ferme
        if (e.target === e.currentTarget) onClose()
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
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
          <h3 className="text-base font-semibold truncate">{title}</h3>
          <button
            type="button"
            className="btn px-2 bg-gray-100 dark:bg-white/10"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">{children}</div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

export default Modal
