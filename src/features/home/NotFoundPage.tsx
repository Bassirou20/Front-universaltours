// src/features/home/NotFoundPage.tsx
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { APP_NAME } from '../../lib/routeMeta'

/**
 * Page 404 : affichée pour toute adresse inconnue.
 * Propose un retour adapté : tableau de bord si connecté, accueil sinon.
 */
export default function NotFoundPage() {
  const { token } = useAuth()
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = `Page introuvable · ${APP_NAME}`
  }, [])

  const home = token
    ? { to: '/dashboard', label: 'Retour au tableau de bord' }
    : { to: '/', label: "Retour à l'accueil" }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50 dark:bg-[#0B1220] text-gray-900 dark:text-gray-100">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
          <Compass size={26} />
        </div>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Erreur 404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Cette page n'existe pas</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          L'adresse <span className="font-mono break-all">{pathname}</span> ne correspond à aucune page.
          Le lien est peut-être incomplet ou la page a été déplacée.
        </p>
        <Link
          to={home.to}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ut-orange)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition"
        >
          <ArrowLeft size={15} />
          {home.label}
        </Link>
      </div>
    </div>
  )
}
