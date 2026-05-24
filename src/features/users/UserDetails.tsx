import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { Badge } from '../../ui/Badge'
import {
  Mail, User as UserIcon, Shield, Calendar, CheckCircle2, XCircle,
  Clock, Activity, LogIn, AlertTriangle, Loader2,
} from 'lucide-react'

export type UserModel = {
  id: number
  prenom?: string | null
  nom?: string | null
  email?: string | null
  role?: string | null
  actif?: boolean | number | null
  created_at?: string | null
  updated_at?: string | null
  last_login_at?: string | null
  must_change_password?: boolean | null
}

type UserStats = {
  user_id: number
  last_login_at: string | null
  last_activity_at: string | null
  reservations_count: number
  recent_activities: Array<{ action: string; description: string; created_at: string }>
  created_at: string | null
  must_change_password: boolean
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const safeDateTime = (d?: string | null) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const relativeTime = (d?: string | null): string => {
  if (!d) return 'Jamais'
  const t = new Date(d).getTime()
  if (Number.isNaN(t)) return 'Jamais'
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 60) return "À l'instant"
  if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 604800) return `Il y a ${Math.floor(diffSec / 86400)} j`
  return safeDateTime(d)
}

const roleTone = (role?: string | null) => {
  const r = String(role || '').toLowerCase()
  if (r.includes('admin')) return 'purple'
  if (r.includes('employee') || r.includes('agent')) return 'blue'
  return 'gray'
}

const roleLabel = (role?: string | null) => {
  const r = String(role || '').toLowerCase()
  if (!r) return '—'
  if (r === 'admin') return 'Administrateur'
  if (r === 'employee') return 'Agent'
  return role || '—'
}

const actionLabel = (action: string): string => {
  const map: Record<string, string> = {
    login: 'Connexion',
    logout: 'Déconnexion',
    password_change: 'Changement de mot de passe',
    reservation_created: 'Réservation créée',
    reservation_updated: 'Réservation modifiée',
    reservation_deleted: 'Réservation supprimée',
    facture_created: 'Facture créée',
    paiement_created: 'Paiement enregistré',
  }
  return map[action] || action.replace(/_/g, ' ')
}

function initialsFromUser(u: UserModel) {
  const a = String(u?.prenom || '').trim()
  const b = String(u?.nom || '').trim()
  const s = `${a} ${b}`.trim() || String(u?.email || '').trim() || 'UT'
  const parts = s.split(/\s+/).filter(Boolean)
  const i1 = parts[0]?.[0] ?? 'U'
  const i2 = parts[1]?.[0] ?? parts[0]?.[1] ?? 'T'
  return `${i1}${i2}`.toUpperCase()
}

// ─── KPI Card compact ───────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, hint, tone = 'gray',
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'gray' | 'sky' | 'emerald' | 'amber' | 'purple'
}) {
  const tones = {
    gray:    { bg: 'bg-gray-100 dark:bg-white/[0.06]',         text: 'text-gray-600 dark:text-gray-300' },
    sky:     { bg: 'bg-sky-100 dark:bg-sky-500/15',            text: 'text-sky-700 dark:text-sky-300' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/15',    text: 'text-emerald-700 dark:text-emerald-300' },
    amber:   { bg: 'bg-amber-100 dark:bg-amber-500/15',        text: 'text-amber-700 dark:text-amber-300' },
    purple:  { bg: 'bg-purple-100 dark:bg-purple-500/15',      text: 'text-purple-700 dark:text-purple-300' },
  }[tone]

  return (
    <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-panel p-3 flex items-start gap-3">
      <div className={cx('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', tones.bg, tones.text)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
          {label}
        </div>
        <div className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
          {value}
        </div>
        {hint && <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{hint}</div>}
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="text-[12px] text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-[12.5px] font-medium text-gray-900 dark:text-gray-100 text-right max-w-[65%] break-words">
        {value ?? '—'}
      </div>
    </div>
  )
}

function Card({
  title, icon, children, action,
}: {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
          <span className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 truncate">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function UserDetails({ user }: { user?: UserModel | null }) {
  if (!user) {
    return <div className="py-4 text-sm text-gray-500">Aucun utilisateur sélectionné.</div>
  }

  const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || '—'
  const isActive = !!user.actif
  const initials = useMemo(() => initialsFromUser(user), [user])

  // Fetch enrichi : stats + activités récentes
  const qStats = useQuery<UserStats>({
    queryKey: ['users', user.id, 'stats'],
    queryFn: async () => {
      const { data } = await api.get(`/users/${user.id}/stats`)
      return data
    },
    enabled: !!user.id,
    staleTime: 30_000,
  })

  const stats = qStats.data
  const lastLogin = stats?.last_login_at ?? user.last_login_at ?? null
  const mustChange = stats?.must_change_password ?? !!user.must_change_password

  return (
    <div className="space-y-4">

      {/* Header pro avec avatar + identité + badges */}
      <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50/50 dark:from-panel dark:to-white/[0.02] p-4">
        <div className="flex items-start gap-4">
          <div className={cx(
            'h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center text-base font-bold text-white',
            user.role === 'admin' ? 'bg-purple-500' : 'bg-sky-500'
          )}>
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-bold text-gray-900 dark:text-gray-100 truncate">
              {fullName}
            </div>
            <div className="text-[12.5px] text-gray-500 dark:text-gray-400 truncate inline-flex items-center gap-1.5 mt-0.5">
              <Mail size={11} />
              {user.email || '—'}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={roleTone(user.role) as any}>
                <span className="inline-flex items-center gap-1">
                  <Shield size={11} /> {roleLabel(user.role)}
                </span>
              </Badge>
              <Badge tone={isActive ? 'green' : 'red'}>
                <span className="inline-flex items-center gap-1">
                  {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                  {isActive ? 'Actif' : 'Inactif'}
                </span>
              </Badge>
              {mustChange && (
                <Badge tone="amber">
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle size={11} />
                    Mot de passe à changer
                  </span>
                </Badge>
              )}
              <Badge tone="gray">ID #{user.id}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={<LogIn size={16} />}
          label="Dernière connexion"
          value={lastLogin ? relativeTime(lastLogin) : 'Jamais'}
          hint={lastLogin ? safeDateTime(lastLogin) : 'Le compte n\'a jamais été utilisé'}
          tone={lastLogin ? 'sky' : 'gray'}
        />
        <KpiCard
          icon={<Activity size={16} />}
          label="Réservations créées"
          value={qStats.isLoading ? '…' : (stats?.reservations_count ?? 0).toLocaleString('fr-FR')}
          hint="depuis la création du compte"
          tone="emerald"
        />
        <KpiCard
          icon={<Clock size={16} />}
          label="Dernière activité"
          value={stats?.last_activity_at ? relativeTime(stats.last_activity_at) : 'Aucune'}
          hint={stats?.last_activity_at ? safeDateTime(stats.last_activity_at) : 'Pas d\'action enregistrée'}
          tone={stats?.last_activity_at ? 'amber' : 'gray'}
        />
      </div>

      {/* Détails + activités récentes côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Informations" icon={<UserIcon size={14} />}>
          <KV label="Prénom" value={user.prenom || '—'} />
          <KV label="Nom" value={user.nom || '—'} />
          <KV label="Email" value={user.email || '—'} />
          <KV label="Rôle" value={roleLabel(user.role)} />
          <KV label="Compte créé le" value={safeDateTime(user.created_at)} />
          <KV label="Mis à jour le" value={safeDateTime(user.updated_at)} />
        </Card>

        <Card
          title="Activités récentes"
          icon={<Activity size={14} />}
          action={qStats.isFetching && <Loader2 size={11} className="animate-spin text-gray-400" />}
        >
          {qStats.isLoading ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
              <Loader2 size={14} className="animate-spin mx-auto mb-1.5" />
              Chargement…
            </div>
          ) : stats?.recent_activities && stats.recent_activities.length > 0 ? (
            <ul className="space-y-2.5">
              {stats.recent_activities.map((a, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--ut-orange)] mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
                      {actionLabel(a.action)}
                    </div>
                    {a.description && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {a.description}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {relativeTime(a.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
              <Activity size={20} className="mx-auto mb-2 opacity-50" />
              Aucune activité récente
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
