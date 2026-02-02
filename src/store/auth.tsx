import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/axios'

type Role = 'admin' | 'employee' | string
type User = { id: number; nom?: string; prenom?: string; email: string; role?: Role; actif?: number | boolean }

type AuthCtx = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const clearClientAuth = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('auth_token')
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

  // Au chargement : restaurer token + header, puis récupérer /me
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      setAxiosAuthHeader(null)
      return
    }

    try {
      const parsed = JSON.parse(saved)
      const t: string | null = parsed?.token ?? null
      const u: User | null = parsed?.user ?? null

      setToken(t)
      setUser(u)
      setAxiosAuthHeader(t)

      // si on a un token, on rafraîchit l'utilisateur depuis l'API (role, actif, etc.)
      if (t) {
        refreshMe()
      }
    } catch {
      clearClientAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const value = useMemo(() => ({ user, token, login, logout, refreshMe }), [user, token])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = (): AuthCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
