import React from 'react'
import { Badge } from '../../ui/Badge'
import { Mail, User as UserIcon, Shield } from 'lucide-react'

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

const roleTone = (role?: string | null) => {
  const r = (role || '').toLowerCase()
  if (r.includes('admin')) return 'purple'
  if (r.includes('agent')) return 'blue'
  return 'gray'
}

export default function UserDetails({ user }: { user: UserModel }) {
  const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || '—'
  const isActive = !!user.actif

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold flex items-center gap-2">
          <UserIcon size={18} /> {fullName}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge tone={roleTone(user.role) as any}>
            <span className="inline-flex items-center gap-1"><Shield size={14} /> {user.role || '—'}</span>
          </Badge>
          <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
          {user.email ? (
            <Badge tone="gray">
              <span className="inline-flex items-center gap-1"><Mail size={14} /> {user.email}</span>
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
          <div className="text-xs text-gray-500 mb-1">Créé</div>
          <div className="text-sm font-semibold">{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</div>
        </div>

        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
          <div className="text-xs text-gray-500 mb-1">Dernière mise à jour</div>
          <div className="text-sm font-semibold">{user.updated_at ? new Date(user.updated_at).toLocaleString() : '—'}</div>
        </div>
      </div>
    </div>
  )
}
