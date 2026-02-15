import React, { useMemo } from 'react'
import { Badge } from '../../ui/Badge'
import { Mail, User as UserIcon, Shield, Calendar, CheckCircle2, XCircle } from 'lucide-react'

export type UserModel = {
  id: number
  prenom?: string | null
  nom?: string | null
  email?: string | null
  role?: string | null
  actif?: boolean | number | null
  created_at?: string | null
  updated_at?: string | null
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const safeDateTime = (d?: string | null) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString()
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
  if (r === 'admin') return 'Admin'
  if (r === 'employee') return 'Employé'
  return role || '—'
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

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[65%] break-words">
        {value ?? '—'}
      </div>
    </div>
  )
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft">
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2">
        {icon ? <span className="text-gray-700 dark:text-gray-200">{icon}</span> : null}
        <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function UserDetails({ user }: { user?: UserModel | null }) {
  // ✅ Robust guard (évite crash si Modal garde children montés)
  if (!user) {
    return <div className="py-6 text-sm text-gray-500">Aucun utilisateur sélectionné.</div>
  }

  const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || '—'
  const isActive = !!user.actif

  const initials = useMemo(() => initialsFromUser(user), [user])

  return (
    <div className="space-y-4">
      {/* Header pro */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cx(
                'h-12 w-12 rounded-2xl flex items-center justify-center font-semibold',
                'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
              )}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate inline-flex items-center gap-2">
                <UserIcon size={18} className="opacity-80" />
                {fullName}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                {user.email || '—'}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={roleTone(user.role) as any}>
                  <span className="inline-flex items-center gap-1">
                    <Shield size={14} /> {roleLabel(user.role)}
                  </span>
                </Badge>
                <Badge tone={isActive ? 'green' : 'red'}>
                  <span className="inline-flex items-center gap-1">
                    {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {isActive ? 'Actif' : 'Inactif'}
                  </span>
                </Badge>
                <Badge tone="gray">ID: #{user.id}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Profil" icon={<UserIcon size={18} />}>
          <div className="space-y-3">
            <KV label="Prénom" value={user.prenom || '—'} />
            <KV label="Nom" value={user.nom || '—'} />
            <KV
              label="Email"
              value={
                user.email ? (
                  <span className="inline-flex items-center gap-2">
                    <Mail size={14} className="opacity-70" />
                    {user.email}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <KV label="Rôle" value={roleLabel(user.role)} />
            <KV label="Statut" value={isActive ? 'Actif' : 'Inactif'} />
          </div>
        </Card>

        <Card title="Historique" icon={<Calendar size={18} />}>
          <div className="space-y-3">
            <KV label="Créé le" value={safeDateTime(user.created_at)} />
            <KV label="Mis à jour" value={safeDateTime(user.updated_at)} />
          </div>
        </Card>
      </div>
    </div>
  )
}
