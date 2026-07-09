// src/lib/axios.ts
import axios from "axios"

export const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"

export const api = axios.create({
  baseURL: API_BASE,
})

const STORAGE_KEY = "ut_auth"

function readToken(): string | null {
  // Source de vérité = ut_auth (JSON)
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const token = parsed?.token
      if (typeof token === "string" && token.length > 0) return token
    } catch {
      // ignore JSON parse errors
    }
  }

  // Fallback (ancienne clé si jamais tu l’avais utilisée)
  const legacy = localStorage.getItem("auth_token")
  if (legacy && legacy.length > 0) return legacy

  return null
}

// Intercepteur pour mettre le Bearer
api.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

// Optionnel : si 401 -> logout + redirection login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem("auth_token") // nettoyage legacy
      delete (api.defaults.headers.common as any).Authorization
      location.href = "/login"
    }
    return Promise.reject(err)
  }
)
