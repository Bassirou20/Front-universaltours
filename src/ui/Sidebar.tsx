import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutGrid,
  Users,
  Plane,
  FolderGit2,
  Receipt,
  Wallet,
  Briefcase,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../store/auth'
import logo from '../assets/brand/logounivtours.jpg'

type Item = {
  to: string
  label: string
  icon: React.ReactNode
}

type Group = {
  title: string
  items: Item[]
}

const NavItem: React.FC<{
  item: Item
  active: boolean
  onClick?: () => void
}> = ({ item, active, onClick }) => {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={clsx(
        'ut-side-item',
        active ? 'ut-side-item-active' : 'ut-side-item-idle'
      )}
      title={item.label}
    >
      <span className="ut-side-indicator" />
      <span className="ut-side-icon">{item.icon}</span>
      <span className="truncate font-semibold">{item.label}</span>
    </NavLink>
  )
}

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { user } = useAuth()
  const location = useLocation()

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim()
  const displayName = fullName || user?.email || 'Compte'

  const roleRaw = String(user?.role || '').toLowerCase()
  const isAdmin = roleRaw === 'admin'
  const roleLabel = roleRaw === 'admin' ? 'Admin' : roleRaw === 'employee' ? 'Employé' : (user?.role || '—')

  const groups: Group[] = useMemo(() => {
    const base: Group[] = [
      {
        title: 'Vue d’ensemble',
        items: [{ to: '/', label: 'Dashboard', icon: <LayoutGrid size={18} /> }],
      },
      {
        title: 'Opérations',
        items: [
          { to: '/clients', label: 'Clients', icon: <Users size={18} /> },
          { to: '/produits', label: 'Services', icon: <Plane size={18} /> },
          { to: '/forfaits', label: 'Forfaits', icon: <FolderGit2 size={18} /> },
          { to: '/reservations', label: 'Réservations', icon: <Receipt size={18} /> },
        ],
      },
      {
        title: 'Finance',
        items: [
          { to: '/factures', label: 'Factures', icon: <Wallet size={18} /> },
          { to: '/paiements', label: 'Paiements', icon: <Briefcase size={18} /> },
          { to: '/depenses', label: 'depenses', icon: <Receipt size={18} /> },
        ],
      },
    ]

    // ✅ Admin only
    if (isAdmin) {
      base.push({
        title: 'Administration',
        items: [{ to: '/users', label: 'Utilisateurs', icon: <Users size={18} /> }],
      })
    }

    return base
  }, [isAdmin])

  const isActivePath = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <aside className="ut-sidebar">
      {/* Brand header */}
      <div className="ut-side-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ut-side-logo">
            <img src={logo} alt="Universal Tours" className="h-8 w-auto" draggable={false} />
          </div>

          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              Universal Tours
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Gestion • Réservations • Factures
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="ut-side-nav">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            <div className="ut-side-group-title">{g.title}</div>
            <div className="flex flex-col gap-1">
              {g.items.map((it) => (
                <NavItem
                  key={it.to}
                  item={it}
                  active={isActivePath(it.to)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / user */}
      <div className="ut-side-footer">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {roleLabel ? `Rôle : ${roleLabel}` : '—'}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
