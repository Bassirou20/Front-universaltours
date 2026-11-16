import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useRole } from '../hooks/useRole'

export const AuthGuard: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

/**
 * Garde des routes /super-admin/* : réservées au rôle super_admin.
 * À utiliser comme route parente (rend <Outlet />), à l'intérieur d'AuthGuard.
 */
export const SuperAdminGuard: React.FC = () => {
  const { user } = useAuth()
  const { isSuperAdmin } = useRole()
  // Profil pas encore chargé (ex. juste après login) : on attend sans rien afficher.
  if (!user) return null
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
