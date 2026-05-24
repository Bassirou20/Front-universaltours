// src/ui/ConfirmDialog.tsx
import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  title?: string
  message?: string
  itemName?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirmer la suppression',
  message = 'Cette action est irréversible.',
  itemName,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
}) => {
  const resolvedTitle = itemName ? `Supprimer « ${itemName} » ?` : title

  return (
    <Modal open={open} onClose={onCancel} title={resolvedTitle} widthClass="max-w-sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/15">
          <AlertTriangle size={26} className="text-red-600 dark:text-red-400" />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>

        <div className="flex w-full gap-2 mt-1">
          <button
            type="button"
            className="flex-1 btn bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="flex-1 btn bg-red-600 hover:bg-red-700 text-white transition-colors"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
