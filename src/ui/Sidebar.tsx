import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Package, Layers, CalendarCheck,
  FileText, CreditCard, PiggyBank, Activity,
  ChevronsLeft, ChevronsRight, TrendingDown, ShieldCheck,
  HelpCircle, Settings,
} from 'lucide-react'
import { useAuth } from '../store/auth'
import logo from '../assets/brand/logounivtours.webp'

type Item = {
  to: string
  label: string
  icon: React.ReactNode
  hasActivity?: boolean
}
type Group = { title: string; items: Item[] }

// ─── NavItem ─────────────────────────────────────────────────────────────────
// Style Stripe : bordure gauche orange sur item actif, icônes monochromes,
// petit point orange à droite pour les items avec activité récente.

const NavItem: React.FC<{
  item: Item
  active: boolean
  onClick?: () => void
  collapsed?: boolean
}> = ({ item, active, onClick, collapsed }) => (
  <NavLink
    to={item.to}
    onClick={onClick}
    title={collapsed ? item.label : undefined}
    className={[
      'group relative flex items-center transition-colors duration-150 select-none',
      collapsed
        ? 'justify-center h-8 w-full'
        : 'gap-2.5 h-[30px] px-4 pl-[14px]',
      active
        ? 'bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 font-semibold'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-gray-200 font-medium',
    ].join(' ')}
  >
    {/* Bordure gauche orange — uniquement quand actif et étendu */}
    {!collapsed && (
      <span
        className={[
          'absolute left-0 top-0 bottom-0 w-[2px] transition-colors',
          active ? 'bg-[var(--ut-orange)]' : 'bg-transparent',
        ].join(' ')}
      />
    )}

    {/* Icône monochrome (orange uniquement si actif) */}
    <span
      className={[
        'flex shrink-0 items-center justify-center h-4 w-4 transition-colors',
        active
          ? 'text-[var(--ut-orange)]'
          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300',
      ].join(' ')}
    >
      {item.icon}
    </span>

    {/* Label */}
    {!collapsed && (
      <span className="flex-1 truncate text-[12.5px] leading-tight">{item.label}</span>
    )}

    {/* Point d'activité — petit, orange, à droite */}
    {!collapsed && item.hasActivity && (
      <span
        className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--ut-orange)]"
        aria-label="Activité récente"
      />
    )}
  </NavLink>
)

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<{
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}> = ({ onNavigate, collapsed = false, onToggleCollapse }) => {
  const { user } = useAuth()
  const location = useLocation()

  const roleRaw = String(user?.role || '').toLowerCase()
  const isAdmin = roleRaw === 'admin'

  // TODO: brancher sur l'API pour des compteurs réels
  const hasReservationsActivity = true  // remplace par > 0 selon API
  const hasFacturesActivity = true       // remplace par > 0 selon API

  const groups: Group[] = useMemo(() => {
    const base: Group[] = [
      {
        title: "Vue d'ensemble",
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: <LayoutGrid size={14} /> },
        ],
      },
      {
        title: 'Opérations',
        items: [
          { to: '/clients',      label: 'Clients',      icon: <Users size={14} /> },
          { to: '/produits',     label: 'Services',     icon: <Package size={14} /> },
          { to: '/forfaits',     label: 'Forfaits',     icon: <Layers size={14} /> },
          { to: '/reservations', label: 'Réservations', icon: <CalendarCheck size={14} />, hasActivity: hasReservationsActivity },
        ],
      },
      {
        title: 'Finance',
        items: [
          { to: '/factures',  label: 'Factures',       icon: <FileText size={14} />, hasActivity: hasFacturesActivity },
          { to: '/paiements', label: 'Paiements',      icon: <CreditCard size={14} /> },
          { to: '/avoirs',    label: 'Avoirs clients', icon: <PiggyBank size={14} /> },
          { to: '/depenses',  label: 'Dépenses',       icon: <TrendingDown size={14} /> },
        ],
      },
    ]

    if (isAdmin) {
      base.push({
        title: 'Administration',
        items: [
          { to: '/users',     label: 'Utilisateurs',        icon: <ShieldCheck size={14} /> },
          { to: '/activites', label: "Journal d'activité",  icon: <Activity size={14} /> },
        ],
      })
    }

    return base
  }, [isAdmin, hasReservationsActivity, hasFacturesActivity])

  const isActive = (to: string) =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'))

  return (
    <aside className="ut-sidebar">

      {/* ── Header (brand) ── */}
      <div className="ut-side-header">
        {collapsed ? (
          <div className="flex w-full justify-center">
            <div className="ut-side-logo">
              <img src={logo} alt="UT" className="h-6 w-auto object-contain" draggable={false} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="ut-side-logo">
              <img src={logo} alt="Universal Tours" className="h-6 w-auto object-contain" draggable={false} />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-[12.5px] font-bold text-gray-900 dark:text-gray-100 truncate tracking-tight">
                Universal Tours
              </div>
              <div className="text-[9.5px] text-gray-400 dark:text-gray-500 truncate">
                Agence de voyage
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav (bordures entre sections) ── */}
      <nav className="ut-side-nav">
        {groups.map((g, gi) => (
          <div
            key={g.title}
            className={[
              'py-1.5',
              gi > 0 ? 'border-t border-black/[0.05] dark:border-white/[0.06]' : '',
            ].join(' ')}
          >
            {/* Titre de groupe — plus visible que Workspace, gris foncé semibold */}
            {!collapsed && (
              <div className="px-4 pt-1.5 pb-1">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 tracking-[0.01em]">
                  {g.title}
                </span>
              </div>
            )}

            <div className="flex flex-col">
              {g.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  active={isActive(item.to)}
                  onClick={onNavigate}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer : statut système + version + aide + settings ── */}
      <div className="ut-side-footer">
        {collapsed ? (
          /* Mode réduit : juste le toggle */
          onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Agrandir le menu"
              className="flex w-full items-center justify-center h-7 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronsRight size={12} />
            </button>
          )
        ) : (
          <div className="space-y-1.5">
            {/* Ligne 1 : statut + version */}
            <div className="flex items-center justify-between gap-2 px-1 text-[10.5px] text-gray-400 dark:text-gray-500">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="relative inline-flex h-[6px] w-[6px]">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />
                </span>
                Tous systèmes ok
              </span>
              <span className="tabular-nums">v1.0.0</span>
            </div>

            {/* Ligne 2 : aide + settings + collapse */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[10.5px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  title="Aide & support"
                >
                  <HelpCircle size={11} />
                  <span>Aide</span>
                </button>
                <NavLink
                  to="/profile"
                  onClick={onNavigate}
                  className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  title="Préférences"
                >
                  <Settings size={11} />
                </NavLink>
              </div>

              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  title="Réduire le menu"
                  className="inline-flex items-center gap-1 text-[10.5px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronsLeft size={11} />
                  <span>Réduire</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </aside>
  )
}

export default Sidebar
