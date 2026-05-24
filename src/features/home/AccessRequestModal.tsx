// src/features/home/AccessRequestModal.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import {
  X, User, Mail, Phone, Building2, MessageSquare,
  Send, Loader2, CheckCircle2,
} from 'lucide-react'

type Form = {
  nom: string
  prenom: string
  email: string
  telephone: string
  societe: string
  message: string
}

const EMPTY: Form = {
  nom: '', prenom: '', email: '', telephone: '', societe: '', message: '',
}

const isValidEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e)

export default function AccessRequestModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [sent, setSent] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
      setSent(false)
      // Focus le premier champ après l'animation
      setTimeout(() => firstInputRef.current?.focus(), 100)
    }
  }, [open])

  // Ferme avec Échap
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    // Bloque le scroll de la page
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  const validate = (): boolean => {
    const e: Partial<Record<keyof Form, string>> = {}
    if (!form.nom.trim()) e.nom = 'Nom requis'
    if (!form.email.trim()) e.email = 'Email requis'
    else if (!isValidEmail(form.email.trim())) e.email = 'Email invalide'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mSubmit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/access-requests', {
        nom:       form.nom.trim(),
        prenom:    form.prenom.trim() || null,
        email:     form.email.trim(),
        telephone: form.telephone.trim() || null,
        societe:   form.societe.trim() || null,
        message:   form.message.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      setSent(true)
      toast.push({ title: 'Demande envoyée ✓', tone: 'success' })
      // Auto-close après 2.5s
      setTimeout(() => onClose(), 2500)
    },
    onError: (err: any) => {
      const status = err?.response?.status
      const msg = err?.response?.data?.message
      if (status === 429) {
        toast.push({ title: msg || 'Trop de demandes. Réessayez plus tard.', tone: 'error' })
      } else if (status === 422) {
        // Erreurs de validation
        const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined
        if (apiErrors) {
          const fieldErrors: Partial<Record<keyof Form, string>> = {}
          for (const [field, msgs] of Object.entries(apiErrors)) {
            (fieldErrors as any)[field] = msgs[0]
          }
          setErrors(fieldErrors)
        }
        toast.push({ title: 'Vérifiez les champs', tone: 'error' })
      } else {
        toast.push({ title: msg || "Erreur lors de l'envoi", tone: 'error' })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sent || mSubmit.isPending) return
    if (!validate()) return
    mSubmit.mutate()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden text-[#1a1916]">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div>
            <div className="text-[18px] font-bold tracking-[-0.01em] text-[#1a1916]">
              Demander un accès
            </div>
            <div className="text-[12.5px] text-[#6b6a66] mt-1">
              Remplissez ce formulaire, notre équipe vous recontactera rapidement.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mSubmit.isPending}
            className="shrink-0 w-8 h-8 rounded-lg text-[#9e9d99] hover:text-[#1a1916] hover:bg-black/[0.05] flex items-center justify-center transition disabled:opacity-40"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success state */}
        {sent ? (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <div className="text-[15px] font-semibold text-[#1a1916] mb-1">
              Demande envoyée
            </div>
            <div className="text-[12.5px] text-[#6b6a66] max-w-[280px] mx-auto">
              Notre équipe va examiner votre demande et vous recontactera par email rapidement.
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">

            {/* Nom + Prénom */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom" required error={errors.nom}>
                <IconInput icon={<User size={13} />}>
                  <input
                    ref={firstInputRef}
                    className="inp"
                    value={form.nom}
                    onChange={(e) => set('nom', e.target.value)}
                    disabled={mSubmit.isPending}
                  />
                </IconInput>
              </Field>
              <Field label="Prénom" error={errors.prenom}>
                <input
                  className="inp inp-plain"
                  value={form.prenom}
                  onChange={(e) => set('prenom', e.target.value)}
                  disabled={mSubmit.isPending}
                />
              </Field>
            </div>

            {/* Email */}
            <Field label="Email" required error={errors.email}>
              <IconInput icon={<Mail size={13} />}>
                <input
                  type="email"
                  className="inp"
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  disabled={mSubmit.isPending}
                />
              </IconInput>
            </Field>

            {/* Téléphone */}
            <Field label="Téléphone" error={errors.telephone}>
              <IconInput icon={<Phone size={13} />}>
                <input
                  className="inp"
                  placeholder="+221 77 123 45 67"
                  value={form.telephone}
                  onChange={(e) => set('telephone', e.target.value)}
                  disabled={mSubmit.isPending}
                />
              </IconInput>
            </Field>

            {/* Société / Agence */}
            <Field label="Agence / Société" error={errors.societe}>
              <IconInput icon={<Building2 size={13} />}>
                <input
                  className="inp"
                  placeholder="Nom de votre structure"
                  value={form.societe}
                  onChange={(e) => set('societe', e.target.value)}
                  disabled={mSubmit.isPending}
                />
              </IconInput>
            </Field>

            {/* Message */}
            <Field label="Message" hint="Contexte, besoins, questions…" error={errors.message}>
              <div className="relative">
                <MessageSquare size={13} className="absolute left-3 top-3 text-[#9e9d99] pointer-events-none" />
                <textarea
                  className="inp inp-plain pl-9 py-2.5 min-h-[80px] resize-y"
                  rows={3}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  disabled={mSubmit.isPending}
                  maxLength={2000}
                />
              </div>
            </Field>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={mSubmit.isPending}
                className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-[#6b6a66] hover:bg-black/[0.04] hover:text-[#1a1916] transition disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={mSubmit.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-gradient-to-br from-[#F07A1C] to-[#c84a14] shadow-[0_4px_12px_rgba(240,122,28,0.30)] hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(240,122,28,0.40)] transition disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {mSubmit.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Envoyer la demande
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Styles inputs scopés au modal pour éviter d'imposer global */}
      <style>{`
        .inp {
          width: 100%;
          padding: 9px 11px 9px 32px;
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 8px;
          background: white;
          font-size: 12.5px;
          color: #1a1916;
          transition: border .15s, box-shadow .15s;
          outline: none;
        }
        .inp.inp-plain { padding-left: 11px; }
        .inp::placeholder { color: #9e9d99; }
        .inp:focus { border-color: #F07A1C; box-shadow: 0 0 0 3px rgba(240,122,28,0.15); }
        .inp:disabled { opacity: 0.6; background: #fafafa; }
      `}</style>
    </div>
  )
}

// ─── Petits composants internes ──────────────────────────────────────────────

function Field({
  label, required, hint, error, children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold text-[#6b6a66] uppercase tracking-[0.04em] mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <div className="text-[10.5px] text-[#9e9d99] mt-1">{hint}</div>}
      {error && <div className="text-[10.5px] text-red-600 mt-1">{error}</div>}
    </div>
  )
}

function IconInput({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9d99] pointer-events-none">
        {icon}
      </span>
      {children}
    </div>
  )
}
