import React, { useMemo } from 'react'
import { Menu, ChevronDown, LogOut, User2 } from 'lucide-react'
import { useAuth } from '../store/auth'
import { ThemeToggle } from './ThemeToggle'
import { ActionsMenu } from './ActionsMenu'
import { Badge } from './Badge'

const noop = () => {}

const getInitials = (prenom?: string, nom?: string, email?: string) => {
  const full = [prenom, nom].filter(Boolean).join(' ').trim()
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean)
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  }
  return (email || 'UT').slice(0, 2).toUpperCase()
}

const roleTone = (role?: string) => {
  const r = (role || '').toLowerCase()
  if (r.includes('admin')) return 'purple'
  if (r.includes('agent')) return 'blue'
  if (r.includes('manager')) return 'green'
  return 'gray'
}

const Avatar: React.FC<{ initials: string }> = ({ initials }) => {
  return (
    <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
      <span className="text-white dark:text-black text-xs font-semibold tracking-wide">{initials}</span>
    </div>
  )
}

export const Topbar: React.FC<{ onOpenSidebar?: () => void }> = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth()

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim()
  const initials = getInitials(user?.prenom, user?.nom, user?.email)
  const role = user?.role
  const email = user?.email || ''
  const name = fullName || (email ? email.split('@')[0] : 'Compte')

  const userMenuItems = useMemo(() => {
    // ⚠️ ActionItem exige onClick toujours → on met noop pour les items “infos”
    const items = [
      { label: name, icon: <User2 size={16} />, disabled: true, onClick: noop },
      ...(email ? [{ label: email, disabled: true, onClick: noop }] : []),
      ...(role ? [{ label: `Rôle : ${role}`, disabled: true, onClick: noop }] : []),
      {
        label: 'Déconnexion',
        icon: <LogOut size={16} />,
        tone: 'danger' as const,
        onClick: logout,
      },
    ]

    return items
  }, [name, email, role, logout])

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-panel/85 backdrop-blur border-b border-black/5 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden btn px-2 bg-gray-100 dark:bg-white/10"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold">UT</span>
            </div>

            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                Universal Tours
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Gestion agence • Réservations • Factures
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <div className="flex items-center gap-2 pl-2 border-l border-black/5 dark:border-white/10">
            <Avatar initials={initials} />

            <div className="hidden sm:block leading-tight">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[220px] truncate">
                  {fullName || email || 'Utilisateur'}
                </div>
                {role ? <Badge tone={roleTone(role) as any}>{role}</Badge> : null}
              </div>
              {email ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[260px] truncate">{email}</div>
              ) : null}
            </div>

            <div className="flex items-center">
              <ActionsMenu items={userMenuItems} />
              {/* <ChevronDown size={16} className="opacity-60 -ml-1 hidden sm:block pointer-events-none" /> */}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
