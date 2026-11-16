// src/lib/routeMeta.tsx
// Source unique des libellés de pages : fil d'Ariane (Topbar) + titre d'onglet.
// Toute nouvelle route de App.tsx doit avoir une entrée ici.
import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Package, Layers, CalendarCheck, Stamp, FileText, CreditCard,
  PiggyBank, TrendingDown, Truck, ShieldCheck, Activity, Settings, User, Bell,
  BarChart3, Building, Megaphone,
} from 'lucide-react'

export type RouteMeta = {
  /** Libellé affiché dans le fil d'Ariane et le titre d'onglet. */
  label: string
  icon?: React.ReactNode
  /** Groupe du menu latéral (premier niveau du fil d'Ariane). */
  parent?: string
}

export const APP_NAME = 'Itinéo'

export const ROUTE_META: Record<string, RouteMeta> = {
  // ── Application (authentifié) ──
  '/dashboard':       { label: 'Dashboard',              icon: <LayoutGrid size={14} /> },
  '/clients':         { label: 'Clients',                icon: <Users size={14} />,         parent: 'Opérations' },
  '/produits':        { label: 'Services',               icon: <Package size={14} />,       parent: 'Opérations' },
  '/forfaits':        { label: 'Forfaits',               icon: <Layers size={14} />,        parent: 'Opérations' },
  '/reservations':    { label: 'Réservations',           icon: <CalendarCheck size={14} />, parent: 'Opérations' },
  '/evisa-dossiers':  { label: 'Dossiers e-visa',        icon: <Stamp size={14} />,         parent: 'Opérations' },
  '/factures':        { label: 'Factures',               icon: <FileText size={14} />,      parent: 'Finance' },
  '/paiements':       { label: 'Paiements',              icon: <CreditCard size={14} />,    parent: 'Finance' },
  '/avoirs':          { label: 'Avoirs clients',         icon: <PiggyBank size={14} />,     parent: 'Finance' },
  '/depenses':        { label: 'Dépenses',               icon: <TrendingDown size={14} />,  parent: 'Finance' },
  '/fournisseurs':    { label: 'Fournisseurs',           icon: <Truck size={14} />,         parent: 'Finance' },
  '/users':           { label: 'Utilisateurs',           icon: <ShieldCheck size={14} />,   parent: 'Administration' },
  '/activites':       { label: "Journal d'activité",     icon: <Activity size={14} />,      parent: 'Administration' },
  '/agency/abonnement': { label: 'Abonnement',           icon: <CreditCard size={14} />,    parent: 'Administration' },
  '/agency/settings': { label: "Paramètres de l'agence", icon: <Settings size={14} />,      parent: 'Administration' },
  '/profile':         { label: 'Mon profil',             icon: <User size={14} />,          parent: 'Compte' },
  '/notifications':   { label: 'Notifications',          icon: <Bell size={14} />,          parent: 'Compte' },

  // ── Plateforme (super_admin) ──
  '/super-admin/dashboard':     { label: "Vue d'ensemble",       icon: <BarChart3 size={14} />,  parent: 'Plateforme' },
  '/super-admin/agencies':      { label: 'Toutes les agences',   icon: <Building size={14} />,   parent: 'Plateforme' },
  '/super-admin/revenue':       { label: 'Revenu & abonnements', icon: <CreditCard size={14} />, parent: 'Plateforme' },
  '/super-admin/announcements': { label: 'Annonces',             icon: <Megaphone size={14} />,  parent: 'Plateforme' },
  '/super-admin/activity':      { label: 'Logs cross-agences',   icon: <Activity size={14} />,   parent: 'Plateforme' },

  // ── Pages publiques (titre d'onglet uniquement) ──
  '/login':           { label: 'Connexion' },
  '/signup':          { label: 'Créer un compte' },
  '/verify-email':    { label: "Vérification de l'email" },
  '/forgot-password': { label: 'Mot de passe oublié' },
  '/reset-password':  { label: 'Nouveau mot de passe' },
  '/cgu':             { label: "Conditions d'utilisation" },
  '/confidentialite': { label: 'Politique de confidentialité' },
}

/** Métadonnées de la route la plus précise correspondant au chemin (ex. /reservations/12 → /reservations). */
export function getRouteMeta(pathname: string): RouteMeta | null {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname]
  const match = Object.keys(ROUTE_META)
    .filter((k) => pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return match ? ROUTE_META[match] : null
}

export function useRouteMeta(): RouteMeta | null {
  const { pathname } = useLocation()
  return getRouteMeta(pathname)
}

/**
 * Met à jour le titre de l'onglet à chaque changement de page :
 * « Clients · Itinéo ». Monté une fois dans App.tsx.
 */
export function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const meta = getRouteMeta(pathname)
    document.title = meta ? `${meta.label} · ${APP_NAME}` : APP_NAME
  }, [pathname])
  return null
}
