import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setImpersonatedAgency } from '../lib/axios'

type Role = 'admin' | 'employee' | string
type User = {
  id: number
  nom?: string
  prenom?: string
  email: string
  role?: Role
  actif?: number | boolean
  must_change_password?: boolean
  last_login_at?: string | null
}

type AuthCtx = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  /**
   * Établit une session authentifiée sans passer par /login.
   * Utilisé après l'auto-inscription (signup) : le backend renvoie déjà
   * un token + user, on les injecte dans l'état React + axios + localStorage,
   * puis on navigue côté client (pas de window.location.href = reload).
   */
  setSession: (token: string, user: User | null) => void
  logout: () => Promise<void>
  refreshMe: () => Promise<User | null>
}

const Ctx = createContext<AuthCtx | null>(null)
const STORAGE_KEY = 'ut_auth'

function setAxiosAuthHeader(token?: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete (api.defaults.headers.common as any).Authorization
  }
}

// Lit la session stockée de façon SYNCHRONE (avant le premier rendu).
// Évite la race condition où l'AuthGuard voit token=null au reload
// (ex: après signup via window.location.href) et redirige à tort.
function readStoredAuth(): { token: string | null; user: User | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { token: null, user: null }
    const parsed = JSON.parse(saved)
    return { token: parsed?.token ?? null, user: parsed?.user ?? null }
  } catch {
    return { token: null, user: null }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialisation synchrone depuis localStorage → token dispo dès le 1er rendu
  const initial = readStoredAuth()
  const [user, setUser] = useState<User | null>(initial.user)
  const [token, setToken] = useState<string | null>(initial.token)

  // Pose le header axios immédiatement (avant tout rendu enfant)
  if (initial.token) setAxiosAuthHeader(initial.token)

  const clearClientAuth = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('auth_token')
    setImpersonatedAgency(null)
    setUser(null)
    setToken(null)
    setAxiosAuthHeader(null)
  }

  const refreshMe = async (): Promise<User | null> => {
    try {
      const res = await api.get('/me')
      const u = (res?.data ?? null) as User | null
      setUser(u)

      // garde en storage
      const saved = localStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, user: u }))

      return u
    } catch {
      return null
    }
  }

  // Au chargement : le token est déjà restauré synchroniquement (voir useState ci-dessus).
  // Ici on rafraîchit juste l'utilisateur depuis l'API (role, actif, email_verified_at, etc.).
  useEffect(() => {
    if (initial.token) {
      refreshMe()
    } else {
      setAxiosAuthHeader(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Injecte une session déjà obtenue (ex: réponse du signup) dans l'état.
  // Synchrone : le token est dispo dès le prochain rendu → l'AuthGuard
  // laisse passer immédiatement, sans rechargement de page.
  const setSession = (t: string, u: User | null): void => {
    setToken(t)
    setUser(u)
    setAxiosAuthHeader(t)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u }))
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/login', { email, password })
      const data = res?.data ?? {}

      const t: string =
        data.token ||
        data.access_token ||
        data?.data?.token ||
        data?.meta?.token ||
        ''

      const u: User | null =
        data.user ||
        data?.data?.user ||
        data.profile ||
        (data?.data && typeof data?.data === 'object' ? data.data : null) ||
        null

      if (!t) return false

      setToken(t)
      setAxiosAuthHeader(t)

      // si le backend renvoie user, on l’utilise; sinon on fait /me
      let finalUser = u
      if (!finalUser) {
        finalUser = await refreshMe()
      } else {
        setUser(finalUser)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: finalUser }))
      return true
    } catch {
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await api.post('/logout')
    } catch {
      // ignore
    }
    clearClientAuth()
    window.location.href = '/login'
  }

  const value = useMemo(() => ({ user, token, login, setSession, logout, refreshMe }), [user, token])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = (): AuthCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
