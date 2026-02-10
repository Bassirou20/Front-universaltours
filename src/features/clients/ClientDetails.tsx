// src/features/clients/ClientDetails.tsx
import React, { useMemo, useState } from 'react'
import {
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  CalendarDays,
  StickyNote,
  Copy,
  Check,
  X,
} from 'lucide-react'

type Props = {
  client: any
  onClose: () => void
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString()
}

function initialsFromClient(c: any) {
  const a = String(c?.prenom || '').trim()
  const b = String(c?.nom || '').trim()
  const s = `${a} ${b}`.trim() || String(c?.nom || '').trim() || 'CL'
  const parts = s.split(/\s+/).filter(Boolean)
  const i1 = parts[0]?.[0] ?? 'C'
  const i2 = parts[1]?.[0] ?? parts[0]?.[1] ?? 'L'
  return `${i1}${i2}`.toUpperCase()
}

function displayClientName(c: any) {
  return [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || c?.nom || `Client #${c?.id ?? '—'}`
}

function ToneBadge({
  tone,
  children,
}: {
  tone: 'gray' | 'blue' | 'amber' | 'green'
  children: React.ReactNode
}) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap'
  const cls =
    tone === 'green'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
      : tone === 'amber'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : tone === 'blue'
      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'
  return <span className={`${base} ${cls}`}>{children}</span>
}

function InfoTile({
  icon,
  label,
  value,
  right,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] flex items-center justify-center text-gray-700 dark:text-gray-200">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{value ?? '—'}</div>
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  )
}

export default function ClientDetails({ client, onClose }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const name = useMemo(() => displayClientName(client), [client])
  const initials = useMemo(() => initialsFromClient(client), [client])

  const copy = async (key: string, value?: string) => {
    const v = String(value || '').trim()
    if (!v) return
    try {
      await navigator.clipboard.writeText(v)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1200)
    } catch {}
  }

  const createdAt = safeDate(client?.created_at)
  const country = client?.pays || '—'

  const tel = client?.telephone ? String(client.telephone) : ''
  const email = client?.email ? String(client.email) : ''

  return (
    <div className="space-y-4">
      {/* Header riche */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center font-bold">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {client?.id ? <ToneBadge tone="blue">ID #{client.id}</ToneBadge> : null}
                <ToneBadge tone="amber">Créé le {createdAt}</ToneBadge>
                <ToneBadge tone="gray">{country}</ToneBadge>
              </div>
            </div>
          </div>

          <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onClose} title="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Actions rapides */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={cx('btn', 'bg-gray-200 dark:bg-white/10')}
            disabled={!tel}
            onClick={() => (tel ? window.open(`tel:${tel}`, '_self') : null)}
          >
            <Phone size={16} className="mr-2" />
            Appeler
          </button>

          <button
            type="button"
            className={cx('btn', 'bg-gray-200 dark:bg-white/10')}
            disabled={!email}
            onClick={() => (email ? window.open(`mailto:${email}`, '_self') : null)}
          >
            <Mail size={16} className="mr-2" />
            Email
          </button>

          <button
            type="button"
            className={cx('btn', 'bg-gray-200 dark:bg-white/10')}
            disabled={!tel}
            onClick={() => copy('tel', tel)}
          >
            {copiedKey === 'tel' ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
            Copier téléphone
          </button>

          <button
            type="button"
            className={cx('btn', 'bg-gray-200 dark:bg-white/10')}
            disabled={!email}
            onClick={() => copy('email', email)}
          >
            {copiedKey === 'email' ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
            Copier email
          </button>
        </div>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoTile
          icon={<Mail size={18} />}
          label="Email"
          value={client?.email || '—'}
          right={
            client?.email ? (
              <button
                type="button"
                className="btn px-2 bg-gray-200 dark:bg-white/10"
                onClick={() => copy('email', client.email)}
                title="Copier"
              >
                {copiedKey === 'email' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            ) : undefined
          }
        />

        <InfoTile
          icon={<Phone size={18} />}
          label="Téléphone"
          value={client?.telephone || '—'}
          right={
            client?.telephone ? (
              <button
                type="button"
                className="btn px-2 bg-gray-200 dark:bg-white/10"
                onClick={() => copy('tel', client.telephone)}
                title="Copier"
              >
                {copiedKey === 'tel' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            ) : undefined
          }
        />

        <InfoTile icon={<MapPin size={18} />} label="Adresse" value={client?.adresse || '—'} />
        <InfoTile icon={<Globe size={18} />} label="Pays" value={client?.pays || '—'} />

        <div className="md:col-span-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={16} className="text-gray-500 dark:text-gray-300" />
            <div className="text-sm font-semibold">Notes</div>
          </div>
          <div className="text-sm whitespace-pre-wrap">
            {client?.notes?.trim() ? (
              client.notes
            ) : (
              <span className="text-gray-500">Aucune note</span>
            )}
          </div>
        </div>

        {/* Mini “infos” */}
        <div className="md:col-span-2 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-gray-500 dark:text-gray-300" />
            <div className="text-sm font-semibold">Infos</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">Création</div>
              <div className="mt-1 font-semibold">{safeDate(client?.created_at)}</div>
            </div>
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">Dernière mise à jour</div>
              <div className="mt-1 font-semibold">{safeDate(client?.updated_at)}</div>
            </div>
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">ID</div>
              <div className="mt-1 font-semibold">#{client?.id ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
