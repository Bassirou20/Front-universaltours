// src/features/superadmin/SuperAdminAnnouncementsPage.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Megaphone, Send, Mail, Users, Bell, Info, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'

type Audience = 'admins' | 'all'

type AnnounceResult = { message: string; notified: number; emailed: number }

export default function SuperAdminAnnouncementsPage() {
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('admins')
  const [url, setUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [lastResult, setLastResult] = useState<AnnounceResult | null>(null)

  const mut = useMutation({
    mutationFn: async (): Promise<AnnounceResult> =>
      (await api.post('/super-admin/announcements', {
        title: title.trim(),
        body: body.trim(),
        audience,
        url: url.trim() || null,
        cta_label: ctaLabel.trim() || null,
        send_email: sendEmail,
      })).data,
    onSuccess: (d) => {
      toast.push({ tone: 'success', title: d.message })
      setLastResult(d)
      setConfirm(false)
      setTitle(''); setBody(''); setUrl(''); setCtaLabel('')
    },
    onError: () => {
      toast.push({ tone: 'error', title: "Échec de l'envoi de l'annonce" })
      setConfirm(false)
    },
  })

  const canSubmit = title.trim().length >= 3 && body.trim().length >= 3 && !mut.isPending

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
          <Megaphone size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Annonces plateforme</h1>
          <p className="text-sm text-gray-500">Diffusez un message à toutes les agences (notification + email).</p>
        </div>
      </div>

      {/* Résultat dernière diffusion */}
      {lastResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={16} />
          {lastResult.notified} notification(s) · {lastResult.emailed} email(s) envoyé(s).
        </div>
      )}

      {/* Formulaire */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d1321] p-5 space-y-4">
        {/* Titre */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Titre <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder="Ex : Maintenance planifiée samedi soir"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
          />
        </div>

        {/* Corps */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Message <span className="text-red-500">*</span>
            <span className="font-normal text-gray-400"> — Markdown supporté (**gras**, listes, liens)</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={7}
            placeholder={'Bonjour,\n\nNous réaliserons une **maintenance** samedi de 2h à 4h. Le service pourra être indisponible quelques minutes.\n\nMerci de votre compréhension.'}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none resize-y"
          />
          <div className="text-right text-[12px] text-gray-400 mt-0.5">{body.length}/5000</div>
        </div>

        {/* Lien CTA optionnel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Lien (optionnel)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… ou /dashboard"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Libellé du bouton (optionnel)</label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              maxLength={50}
              placeholder="En savoir plus"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
            />
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Destinataires (notification in-app)</label>
          <div className="flex flex-wrap gap-2">
            <AudienceChip active={audience === 'admins'} onClick={() => setAudience('admins')} icon={<Users size={13} />} label="Propriétaires & admins" />
            <AudienceChip active={audience === 'all'} onClick={() => setAudience('all')} icon={<Bell size={13} />} label="Tous les utilisateurs" />
          </div>
        </div>

        {/* Email toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500/30"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
            <Mail size={14} className="text-gray-400" />
            Envoyer aussi par email (aux <strong>propriétaires</strong> de chaque agence)
          </span>
        </label>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 flex items-start gap-2 text-[12px] text-blue-700 dark:text-blue-300">
          <Info size={14} className="shrink-0 mt-0.5" />
          La notification in-app est instantanée. L'email part avec le branding Itinéo (logo) et peut prendre quelques minutes selon le volume.
        </div>

        {/* Actions */}
        {!confirm ? (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setConfirm(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition"
          >
            <Send size={15} /> Diffuser l'annonce
          </button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 space-y-3">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              Confirmer la diffusion à <strong>toutes les agences</strong>{sendEmail ? ' (notification + email)' : ' (notification in-app)'} ?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={mut.isPending}
                onClick={() => mut.mutate()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2"
              >
                {mut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Oui, diffuser
              </button>
              <button
                type="button"
                disabled={mut.isPending}
                onClick={() => setConfirm(false)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AudienceChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
        active
          ? 'bg-red-50 text-red-700 ring-red-300 dark:bg-red-950/40 dark:text-red-300'
          : 'bg-transparent text-gray-500 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {icon}{label}
    </button>
  )
}
