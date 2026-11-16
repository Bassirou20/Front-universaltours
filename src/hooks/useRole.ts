// src/hooks/useRole.ts
import { useAuth } from '../store/auth'

/** Rôles qui donnent accès à l'administration d'une agence. */
const ADMIN_ROLES = ['admin', 'owner', 'super_admin']

/**
 * Source unique pour les contrôles de rôle côté interface.
 * (Le backend reste l'autorité : ici on ne fait que masquer / rediriger.)
 *
 *  - role         : rôle normalisé en minuscules ('' si non connecté)
 *  - isAdmin      : owner / admin / super_admin
 *  - isSuperAdmin : super_admin uniquement (pilotage plateforme)
 */
export function useRole() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  return {
    role,
    isAdmin: ADMIN_ROLES.includes(role),
    isSuperAdmin: role === 'super_admin',
  }
}
