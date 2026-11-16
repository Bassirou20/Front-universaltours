// src/ui/ImpersonateBanner.tsx
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ShieldAlert, LogOut } from 'lucide-react'
import { getImpersonatedAgency, setImpersonatedAgency } from '../lib/axios'
import { useAuth } from '../store/auth'
import { useAgency } from '../hooks/useAgency'

/**
 * Banner affiché en haut de l'app QUAND un super_admin est entré dans une agence
 * (mode "impersonate"). Permet de quitter le mode en 1 clic.
 *
 * Caché si :
 *  - User n'est pas super_admin
 *  - Aucune agence impersonifiée
 */
export function ImpersonateBanner() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const impersonatedId = getImpersonatedAgency()

  // Pas de banner si pas super_admin ou pas d'impersonation
  if (!user || user.role !== 'super_admin' || !impersonatedId) {
    return null
  }

  const exitImpersonation = () => {
    setImpersonatedAgency(null)
    qc.clear() // vider tout le cache pour repartir frais
    navigate('/super-admin/agencies')
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-between gap-3 z-50">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert size={14} className="shrink-0" />
        <span className="truncate">
          Mode impersonation : vous consultez{' '}
          <strong>{agency?.name || `Agence #${impersonatedId}`}</strong> en tant que super-admin.
        </span>
      </div>
      <button
        type="button"
        onClick={exitImpersonation}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-[12px] font-semibold shrink-0"
      >
        <LogOut size={11} />
        Quitter
      </button>
    </div>
  )
}
