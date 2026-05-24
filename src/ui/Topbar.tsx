import React, { useEffect, useRef, useState } from 'react'
import {
  Menu, LayoutGrid, Users, Plane, FolderGit2, Receipt, Wallet, Briefcase, PiggyBank,
  ChevronRight, ChevronDown, LogOut, User as UserIcon, Mail, ShieldCheck,
} from 'lucide-react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { NotificationsBell } from './NotificationsBell'
import { useAuth } from '../store/auth'

// ─── Route config ─────────────────────────────────────────────────────────────

type RouteInfo = { label: string; icon: React.ReactNode; parent?: string }

const ROUTES: Record<string, RouteInfo> = {
  '/dashboard':    { label: 'Dashboard',     icon: <LayoutGrid size={14} /> },
  '/clients':      { label: 'Clients',       icon: <Users size={14} />,     parent: 'Opérations' },
  '/produits':     { label: 'Services',      icon: <Plane size={14} />,     parent: 'Opérations' },
  '/forfaits':     { label: 'Forfaits',      icon: <FolderGit2 size={14} />,parent: 'Opérations' },
  '/reservations': { label: 'Réservations',  icon: <Receipt size={14} />,   parent: 'Opérations' },
  '/factures':     { label: 'Factures',      icon: <Wallet size={14} />,    parent: 'Finance' },
  '/paiements':    { label: 'Paiements',     icon: <Briefcase size={14} />, parent: 'Finance' },
  '/avoirs':       { label: 'Avoirs clients',icon: <PiggyBank size={14} />, parent: 'Finance' },
  '/depenses':     { label: 'Dépenses',      icon: <Receipt size={14} />,   parent: 'Finance' },
  '/users':        { label: 'Utilisateurs',  icon: <Users size={14} />,     parent: 'Administration' },
}

function useRouteInfo(): RouteInfo | null {
  const { pathname } = useLocation()
  if (ROUTES[pathname]) return ROUTES[pathname]
  const match = Object.keys(ROUTES)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? ROUTES[match] : null
}

// ─── User Menu Dropdown ───────────────────────────────────────────────────────

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const a = (user?.prenom ?? '').trim()[0] ?? ''
  const b = (user?.nom ?? '').trim()[0] ?? ''
  const ini = (a + b).toUpperCase() || (user?.email ?? 'UT').slice(0, 2).toUpperCase()

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim() || user?.email || 'Compte'
  const roleRaw = String(user?.role || '').toLowerCase()
  const isAdmin = roleRaw === 'admin'
  const roleLabel = isAdmin ? 'Administrateur' : roleRaw === 'employee' ? 'Employé' : (user?.role || '—')

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ut-navy)] to-[var(--ut-sky)] text-white text-[11px] font-bold shadow-sm">
          {ini}
        </div>
        <div className="hidden md:flex items-center gap-1.5 min-w-0">
          <div className="min-w-0 text-left">
            <div className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate max-w-[140px]">
              {fullName}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`h-1 w-1 rounded-full ${isAdmin ? 'bg-violet-500' : 'bg-emerald-500'}`} />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">{roleLabel}</span>
            </div>
          </div>
          <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-xl overflow-hidden z-50"
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-black/[0.04] dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ut-navy)] to-[var(--ut-sky)] text-white text-xs font-bold shadow-sm">
                {ini}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {fullName}
                </div>
                {user?.email && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5 flex items-center gap-1">
                    <Mail size={10} className="shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#0d1321]">
              <ShieldCheck size={10} className={isAdmin ? 'text-violet-500' : 'text-emerald-500'} />
              <span className={isAdmin ? 'text-violet-700 dark:text-violet-300' : 'text-emerald-700 dark:text-emerald-300'}>
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/profile') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
            >
              <UserIcon size={14} className="text-gray-400" />
              Mon profil
            </button>
          </div>

          {/* Logout */}
          <div className="py-1 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export const Topbar: React.FC<{ onOpenSidebar?: () => void }> = ({ onOpenSidebar }) => {
  const route = useRouteInfo()

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0d1321] border-b border-black/[0.06] dark:border-white/[0.07]">
      <div className="px-3 md:px-4 lg:px-6 h-14 flex items-center gap-3">

        {/* ── Hamburger mobile ── */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu size={16} />
        </button>

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {route ? (
            <>
              {/* Parent group */}
              {route.parent && (
                <>
                  <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-600 font-medium shrink-0">
                    {route.parent}
                  </span>
                  <ChevronRight size={12} className="hidden sm:block text-gray-300 dark:text-gray-700 shrink-0" />
                </>
              )}

              {/* Current page pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] min-w-0">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">{route.icon}</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {route.label}
                </span>
              </div>
            </>
          ) : (
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Universal Tours</span>
          )}
        </div>

        {/* ── Actions droite ── */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Date courante — masqué sur mobile */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-500 tabular-nums">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <ThemeToggle />

          {/* Cloche notifications */}
          <NotificationsBell />

          {/* Séparateur */}
          <div className="w-px h-5 bg-black/[0.07] dark:bg-white/[0.08] mx-0.5" />

          {/* User menu */}
          <UserMenu />
        </div>

      </div>
    </header>
  )
}
