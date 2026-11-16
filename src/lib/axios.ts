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

// ── Impersonation super_admin ────────────────────────────────────────────────
// Quand un super_admin « entre » dans une agence, on mémorise son id et on
// l'envoie dans l'en-tête X-Agency-Id (lu par le middleware SetTenantContext
// du backend, qui l'ignore pour les utilisateurs normaux).
const IMPERSONATE_KEY = "ut_impersonate_agency_id"

export function getImpersonatedAgency(): number | null {
  try {
    const raw = localStorage.getItem(IMPERSONATE_KEY)
    if (!raw) return null
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function setImpersonatedAgency(agencyId: number | null): void {
  try {
    if (agencyId == null) localStorage.removeItem(IMPERSONATE_KEY)
    else localStorage.setItem(IMPERSONATE_KEY, String(agencyId))
  } catch {
    // stockage indisponible : on ignore
  }
}

// Codes 403 liés à la formule (cf EnsurePlanFeature / UserController côté API)
const PLAN_ERROR_CODES = ["feature_not_in_plan", "user_limit_reached"]

// Intercepteur pour mettre le Bearer (+ X-Agency-Id en mode impersonate)
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}
  const token = readToken()
  if (token) {
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  const agencyId = getImpersonatedAgency()
  if (agencyId) {
    ;(config.headers as any)["X-Agency-Id"] = String(agencyId)
  }
  return config
})

// 401 -> logout + redirection login ; 403 « formule » -> event ut:plan-error
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem("auth_token") // nettoyage legacy
      setImpersonatedAgency(null)
      delete (api.defaults.headers.common as any).Authorization
      location.href = "/login"
    } else if (status === 403) {
      const data = err.response?.data
      if (PLAN_ERROR_CODES.includes(data?.code)) {
        // Écouté par <PlanErrorListener /> qui affiche le toast.
        window.dispatchEvent(
          new CustomEvent("ut:plan-error", {
            detail: { code: data.code, message: data.message ?? null },
          })
        )
      }
    }
    return Promise.reject(err)
  }
)
