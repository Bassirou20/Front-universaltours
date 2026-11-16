// src/hooks/useAgency.ts
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../lib/axios'
import { useAuth } from '../store/auth'

export type Agency = {
  id: number
  name: string
  slug: string
  ref_prefix: string
  email_contact: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  invoice_footer: string | null
  timezone: string
  currency: string
  language: string
  primary_color: string
  plan: string
  status: string
  trial_ends_at?: string | null
  // Champs calculés renvoyés par GET /agency/me
  is_trial?: boolean
  is_trial_expired?: boolean
  days_left_in_trial?: number | null
  // Limites de la formule courante (gating « accès selon la formule »)
  plan_limits?: {
    max_users: number | null
    current_users: number
    can_add_user: boolean
    modules: string[]
  }
}

/**
 * Hook qui :
 *  1. Récupère l'agence courante de l'utilisateur connecté (GET /agency/me)
 *  2. Applique la couleur primaire en CSS variable globale (--brand-primary)
 *  3. Cache les données 5 minutes
 *
 * À utiliser partout où on a besoin du branding (Sidebar, Topbar, Login, etc.).
 */
export function useAgency() {
  const { user } = useAuth()

  const query = useQuery<Agency | null>({
    queryKey: ['agency', 'me'],
    queryFn: async () => {
      try {
        const r = await api.get('/agency/me')
        return r.data
      } catch {
        // Pas authentifié, super_admin sans agence, etc.
        return null
      }
    },
    // On ne fetch que si on est authentifié
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
  })

  // ── Applique la couleur primaire en CSS variable globale ──
  useEffect(() => {
    const color = query.data?.primary_color
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      document.documentElement.style.setProperty('--brand-primary', color)
    } else {
      // Reset à la couleur Itinéo par défaut
      document.documentElement.style.setProperty('--brand-primary', '#052468')
    }
  }, [query.data?.primary_color])

  // Modules premium débloqués par la formule (ex. 'suppliers_expenses').
  // null tant que les limites ne sont pas connues (chargement / ancien backend).
  const modules = query.data?.plan_limits?.modules ?? null

  /**
   * La formule courante débloque-t-elle ce module premium ?
   * Fail-open (true) tant que les limites ne sont pas chargées : on ne masque
   * jamais un lien « par erreur ». L'enforcement réel reste côté backend
   * (middleware plan: → 403 feature_not_in_plan).
   */
  const hasModule = (module: string): boolean => {
    if (!modules) return true
    return modules.includes(module)
  }

  return {
    agency: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
    hasModule,
  }
}
