// src/features/superadmin/AgencyDetailDrawer.tsx
import { money, formatDateShort } from '../../lib/helpers'
import { useQuery } from '@tanstack/react-query'
import {
  X, Building2, Mail, Phone, MapPin, Users, CalendarCheck, Wallet,
  FileText, CreditCard, Loader2, Clock, ShieldCheck, Crown,
} from 'lucide-react'
import { api } from '../../lib/axios'

type Payment = {
  id: number
  plan: string
  amount: number
  currency: string
  cycle_months: number
  provider: string
  status: string
  paid_at: string | null
  created_at: string
}

type Member = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  actif: boolean
  last_login_at: string | null
  created_at: string
}

type AgencyDetail = {
  id: number
  name: string
  slug: string
  ref_prefix: string
  email_contact: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  plan: string
  status: string
  trial_ends_at: string | null
  subscribed_at: string | null
  next_billing_at: string | null
  created_at: string
  deleted_at: string | null
  stats: {
    users_count: number
    clients_count: number
    reservations_count: number
    factures_count: number
    revenue: number
    last_user_login: string | null
  }
  owner: { id: number; nom: string; prenom: string; email: string } | null
  users: Member[]
  recent_payments: Payment[]
}

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-blue-50 text-blue-700 ring-blue-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  past_due: 'bg-amber-50 text-amber-700 ring-amber-200',
  suspended: 'bg-red-50 text-red-700 ring-red-200',
  canceled: 'bg-gray-100 text-gray-700 ring-gray-200',
}
const STATUS_LABELS: Record<string, string> = {
  trial: 'Essai', active: 'Actif', past_due: 'En retard', suspended: 'Suspendu', canceled: 'Résilié',
}
const PAY_STATUS: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-rose-50 text-rose-700', canceled: 'bg-gray-100 text-gray-600',
}


export function AgencyDetailDrawer({ agencyId, onClose }: { agencyId: number | null; onClose: () => void }) {
  const open = agencyId !== null

  const { data, isLoading } = useQuery<AgencyDetail>({
    queryKey: ['super-admin', 'agency-detail', agencyId],
    queryFn: async () => (await api.get(`/super-admin/agencies/${agencyId}`)).data,
    enabled: open,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1321] h-full shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#0d1321] border-b border-black/[0.06] dark:border-white/[0.06] px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 size={18} className="text-red-600" />
            Détail de l'agence
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="py-20 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Identité */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
                {data.logo_url ? (
                  <img src={data.logo_url} alt={data.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">{data.ref_prefix}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{data.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${STATUS_COLORS[data.status] || STATUS_COLORS.canceled}`}>
                    {STATUS_LABELS[data.status] || data.status}
                  </span>
                  <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 capitalize">
                    {data.plan}
                  </span>
                  <span className="text-[12px] font-mono text-gray-400">{data.ref_prefix}</span>
                  {data.deleted_at && (
                    <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">Supprimée</span>
                  )}
                </div>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="grid grid-cols-1 gap-1.5 text-sm">
              <InfoRow icon={<Mail size={13} />} label="Email" value={data.email_contact} />
              <InfoRow icon={<Phone size={13} />} label="Téléphone" value={data.phone} />
              <InfoRow icon={<MapPin size={13} />} label="Adresse" value={data.address} />
            </div>

            {/* Propriétaire */}
            {data.owner && (
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Crown size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {data.owner.prenom} {data.owner.nom}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{data.owner.email}</div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Activité</h4>
              <div className="grid grid-cols-2 gap-2">
                <StatBox icon={<Users size={14} />} label="Utilisateurs" value={data.stats.users_count} />
                <StatBox icon={<Users size={14} />} label="Clients" value={data.stats.clients_count} />
                <StatBox icon={<CalendarCheck size={14} />} label="Réservations" value={data.stats.reservations_count} />
                <StatBox icon={<FileText size={14} />} label="Factures" value={data.stats.factures_count} />
                <StatBox icon={<Wallet size={14} />} label="CA encaissé" value={money(data.stats.revenue)} wide />
              </div>
            </div>

            {/* Abonnement */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Abonnement</h4>
              <div className="grid grid-cols-1 gap-1.5 text-sm">
                <InfoRow icon={<Clock size={13} />} label="Fin d'essai" value={formatDateShort(data.trial_ends_at)} />
                <InfoRow icon={<ShieldCheck size={13} />} label="Abonné depuis" value={formatDateShort(data.subscribed_at)} />
                <InfoRow icon={<CreditCard size={13} />} label="Prochaine échéance" value={formatDateShort(data.next_billing_at)} />
                <InfoRow icon={<Clock size={13} />} label="Dernière connexion" value={formatDateShort(data.stats.last_user_login)} />
              </div>
            </div>

            {/* Derniers paiements */}
            {data.recent_payments.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Derniers paiements d'abonnement</h4>
                <div className="space-y-1.5">
                  {data.recent_payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 capitalize">
                          {p.plan} · {p.cycle_months}m
                        </div>
                        <div className="text-[12px] text-gray-400">
                          {formatDateShort(p.paid_at || p.created_at)} · {p.provider === 'manual' ? 'Manuel' : p.provider}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{money(p.amount)}</div>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[12px] font-semibold ${PAY_STATUS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Équipe */}
            {data.users.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Équipe ({data.users.length})</h4>
                <div className="space-y-1.5">
                  {data.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{u.prenom} {u.nom}</div>
                        <div className="text-[12px] text-gray-400 truncate">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">{u.role}</span>
                        {!u.actif && <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600">inactif</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-xs text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{value || '—'}</span>
    </div>
  )
}

function StatBox({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: number | string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-100 dark:border-gray-800 p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-400">
        {icon}{label}
      </div>
      <div className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</div>
    </div>
  )
}
