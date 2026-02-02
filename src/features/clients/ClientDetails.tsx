import React from 'react'
import {
  Mail, Phone, MapPin, StickyNote, CalendarDays, User2, Copy, Check, Plus
} from 'lucide-react'

export type ClientDetailsModel = {
  id: number
  nom: string
  prenom?: string | null
  email?: string | null
  telephone?: string | null
  adresse?: string | null
  pays?: string | null
  notes?: string | null
  created_at?: string
}

export const ClientDetails: React.FC<{
  client: ClientDetailsModel
  onCreateReservation?: (clientId: number)=>void
}> = ({ client, onCreateReservation }) => {
  const fullName = [client.nom, client.prenom].filter(Boolean).join(' ')
  const initials = (client.nom?.[0] ?? 'C') + (client.prenom?.[0] ?? '')
  const friendlyDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—')

  const Badge: React.FC<{ children: React.ReactNode; tone?: 'blue'|'green'|'amber'|'gray' }> = ({ children, tone='gray' }) => {
    const tones: Record<string,string> = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
      amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      gray: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
    }
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>
  }

  const Copyable: React.FC<{ value?: string | null; href?: string; icon?: React.ReactNode; label?: string }> = ({ value, href, icon, label }) => {
    const [copied, setCopied] = React.useState(false)
    const val = (value ?? '').trim()
    const canCopy = !!val
    const onCopy = async () => {
      if (!canCopy) return
      try { await navigator.clipboard.writeText(val); setCopied(true); setTimeout(()=>setCopied(false), 1200) } catch {}
    }
    const content = (
      <div className="flex items-center gap-2 text-sm">
        <div className="shrink-0">{icon}</div>
        <div className="truncate">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
          <div className="truncate">{val || '—'}</div>
        </div>
      </div>
    )
    return (
      <div className="group flex items-center justify-between gap-2 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-3">
        {href && val ? <a href={href} className="flex-1 min-w-0">{content}</a> : <div className="flex-1 min-w-0">{content}</div>}
        <button type="button" onClick={onCopy} className="btn px-2 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15" disabled={!canCopy}>
          {copied ? <Check size={16}/> : <Copy size={16}/>}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + action */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl grid place-items-center text-lg font-semibold text-white
                            bg-gradient-to-br from-sky-500 to-indigo-600 dark:from-sky-600 dark:to-indigo-700 shadow">
              {initials.toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full grid place-items-center bg-white dark:bg-panel shadow">
              <User2 size={14} className="text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base md:text-lg font-semibold truncate">{fullName || 'Client'}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge tone="blue">ID #{client.id}</Badge>
              <Badge tone="amber">Créé le {friendlyDate(client.created_at)}</Badge>
              <Badge tone="gray">{client.pays || 'Pays non renseigné'}</Badge>
            </div>
          </div>
        </div>

        {onCreateReservation && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={()=> onCreateReservation(client.id)}
            title="Créer une réservation pour ce client"
          >
            <Plus size={16}/> Créer une réservation
          </button>
        )}
      </div>

      <div className="h-px bg-black/5 dark:bg-white/10" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 space-y-3">
          <div className="text-sm font-semibold mb-1">Coordonnées</div>
          <Copyable value={client.email} href={client.email ? `mailto:${client.email}` : undefined} icon={<Mail size={16} className="text-gray-500 dark:text-gray-300" />} label="Email" />
          <Copyable value={client.telephone} href={client.telephone ? `tel:${client.telephone}` : undefined} icon={<Phone size={16} className="text-gray-500 dark:text-gray-300" />} label="Téléphone" />
        </div>

        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 space-y-3">
          <div className="text-sm font-semibold mb-1">Adresse</div>
          <div className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-white/5 p-3">
            <MapPin size={16} className="text-gray-500 dark:text-gray-300 mt-0.5" />
            <div className="text-sm">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Adresse postale</div>
              <div>{client.adresse || '—'}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-white/5 p-3">
            <CalendarDays size={16} className="text-gray-500 dark:text-gray-300 mt-0.5" />
            <div className="text-sm">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Pays</div>
              <div>{client.pays || '—'}</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={16} className="text-gray-500 dark:text-gray-300" />
            <div className="text-sm font-semibold">Notes</div>
          </div>
          <div className="text-sm whitespace-pre-wrap">
            {client.notes?.trim() || <span className="text-gray-500">Aucune note</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientDetails
