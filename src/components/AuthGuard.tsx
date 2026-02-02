
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
export const AuthGuard: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
