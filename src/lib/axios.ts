// src/lib/axios.ts
import axios from "axios"

export const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || "http://universaltours-api.duckdns.org/api"

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    // Force Laravel à répondre en JSON (et à renvoyer 401/422 plutôt qu'une
    // redirection 302 HTML vers une page de login web inexistante).
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
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

// Multi-tenancy : un super_admin peut "entrer" dans une agence pour la consulter.
// L'id de l'agence impersonifiée est stocké en localStorage et envoyé en header X-Agency-Id.
// Backend : le middleware SetTenantContext lira ce header pour résoudre le tenant.
const IMPERSONATE_KEY = "ut_impersonate_agency_id"

export function setImpersonatedAgency(agencyId: number | null) {
  if (agencyId === null) {
    localStorage.removeItem(IMPERSONATE_KEY)
  } else {
    localStorage.setItem(IMPERSONATE_KEY, String(agencyId))
  }
}

export function getImpersonatedAgency(): number | null {
  const v = localStorage.getItem(IMPERSONATE_KEY)
  return v ? parseInt(v, 10) || null : null
}

// Intercepteur pour mettre le Bearer + le header X-Agency-Id si impersonation active
api.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }

  // Si un super_admin a "switché" dans une agence, on envoie l'id
  const impersonatedId = getImpersonatedAgency()
  if (impersonatedId) {
    config.headers = config.headers ?? {}
    ;(config.headers as any)['X-Agency-Id'] = String(impersonatedId)
  }

  return config
})

// Optionnel : si 401 -> logout + redirection login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem("auth_token") // nettoyage legacy
      delete (api.defaults.headers.common as any).Authorization
      location.href = "/login"
    }

    // Essai gratuit expiré OU abonnement payant échu : le backend refuse les
    // mutations avec un code dédié. Dans les deux cas l'action attendue est la
    // même (renouveler / souscrire) → on rafraîchit l'état d'agence pour mettre
    // à jour le bandeau bloquant.
    const code = err?.response?.data?.code
    if (status === 403 && (code === "trial_expired" || code === "subscription_expired")) {
      window.dispatchEvent(new CustomEvent("ut:trial-expired"))
    }

    // Gating « accès selon la formule » : le backend refuse l'action car la
    // formule courante ne débloque pas le module (feature_not_in_plan) ou le
    // quota d'utilisateurs est atteint (user_limit_reached). On émet un event
    // global → toast « Passez à une formule supérieure » (cf PlanErrorListener).
    if (status === 403 && (code === "feature_not_in_plan" || code === "user_limit_reached")) {
      window.dispatchEvent(
        new CustomEvent("ut:plan-error", {
          detail: {
            code,
            message: err?.response?.data?.message ?? null,
          },
        })
      )
    }

    return Promise.reject(err)
  }
)
