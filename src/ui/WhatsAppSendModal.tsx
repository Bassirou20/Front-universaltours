// src/ui/WhatsAppSendModal.tsx
import { useEffect, useMemo, useState } from 'react'
import { X, Send, MessageCircle, Edit3, CheckCircle2 } from 'lucide-react'
import { openWhatsApp, normalizePhone, templates, type WhatsAppContext } from '../lib/whatsapp'

type Template = 'reservationConfirmed' | 'invoiceReminder' | 'paymentReceived' | 'devis' | 'custom'

const TEMPLATE_OPTIONS: Array<{ key: Template; label: string; hint: string; emoji: string }> = [
  { key: 'reservationConfirmed', label: 'Confirmation de réservation', hint: 'Confirme une nouvelle résa au client', emoji: '✅' },
  { key: 'devis',                label: 'Envoyer un devis',            hint: 'Propose le devis avant confirmation', emoji: '📋' },
  { key: 'invoiceReminder',      label: 'Rappel facture impayée',      hint: 'Relance pour facture en attente', emoji: '⏰' },
  { key: 'paymentReceived',      label: 'Confirmation de paiement',    hint: 'Accusé de réception d\'un paiement', emoji: '💰' },
  { key: 'custom',               label: 'Message libre',               hint: 'Écrivez votre propre message', emoji: '✏️' },
]

export default function WhatsAppSendModal({
  open,
  onClose,
  defaultTemplate = 'reservationConfirmed',
  context,
  allowedTemplates,
}: {
  open: boolean
  onClose: () => void
  defaultTemplate?: Template
  context: WhatsAppContext & { montantRecu?: number }
  /** Restreint la liste des templates affichés (par ex. ['invoiceReminder'] pour la page Factures) */
  allowedTemplates?: Template[]
}) {
  const [template, setTemplate] = useState<Template>(defaultTemplate)
  const [message, setMessage] = useState('')
  const phone = context.client?.telephone || ''
  const phoneOK = !!normalizePhone(phone)

  const visibleOptions = useMemo(
    () => allowedTemplates && allowedTemplates.length > 0
      ? TEMPLATE_OPTIONS.filter((o) => allowedTemplates.includes(o.key))
      : TEMPLATE_OPTIONS,
    [allowedTemplates]
  )

  // Recalcule le message à chaque changement de template ou de contexte
  useEffect(() => {
    if (!open) return
    if (template === 'custom') return // ne touche pas au message libre
    const fn = (templates as any)[template]
    setMessage(fn ? fn(context) : '')
  }, [template, open, JSON.stringify(context)])

  // Reset à l'ouverture
  useEffect(() => {
    if (open) setTemplate(defaultTemplate)
  }, [open, defaultTemplate])

  // Ferme avec Échap
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const clientName = [context.client?.prenom, context.client?.nom].filter(Boolean).join(' ') || '—'

  const handleSend = () => {
    if (!phoneOK || !message.trim()) return
    openWhatsApp(phone, message)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[560px] bg-white dark:bg-panel rounded-2xl shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageCircle size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-[-0.01em]">Envoyer un message WhatsApp</div>
              <div className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                À : <strong>{clientName}</strong> · <span className="font-mono">{phone || '—'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center justify-center transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Avertissement si pas de tel */}
          {!phoneOK && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-300">
              ⚠️ Aucun numéro de téléphone valide pour ce client. Ajoutez un numéro depuis sa fiche.
            </div>
          )}

          {/* Sélecteur de template */}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Modèle de message
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {visibleOptions.map((opt) => {
                const active = template === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTemplate(opt.key)}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition',
                      active
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                        : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-black/15',
                    ].join(' ')}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold truncate">{opt.label}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{opt.hint}</div>
                    </div>
                    {active && <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Aperçu/édition du message */}
          <div>
            <label className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              <Edit3 size={11} />
              Message (modifiable)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="w-full px-3 py-2.5 border border-black/[0.14] dark:border-white/15 rounded-lg bg-white dark:bg-white/[0.03] text-[12.5px] outline-none transition focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/15 resize-y font-mono leading-relaxed"
              placeholder="Écrivez votre message ici…"
            />
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              Astuce : utilisez *texte* pour mettre en gras, _texte_ pour italique. {message.length} caractères.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-100 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!phoneOK || !message.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-[12.5px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Send size={13} />
            Ouvrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
