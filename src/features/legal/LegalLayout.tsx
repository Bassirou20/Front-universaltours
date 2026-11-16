// src/features/legal/LegalLayout.tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import logo from '../../assets/brand/itineo-mark.svg'

/**
 * Mise en page commune aux documents légaux (CGU, Confidentialité).
 * Page publique, lisible, sobre — pas de dépendance à l'app authentifiée.
 */
export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1916] flex flex-col">
      {/* ── Header ── */}
      <header className="px-5 sm:px-10 py-4 bg-white border-b border-black/[0.08] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Itinéo" className="h-8 w-auto" />
          <span className="font-semibold text-sm hidden sm:inline">Itinéo</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#555450] hover:text-[#1a1916] font-medium"
        >
          <ArrowLeft size={15} /> Retour à l'accueil
        </Link>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 px-5 sm:px-6 py-10">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-[#9e9d99] mt-2">Dernière mise à jour : {updatedAt}</p>

          <div className="legal-content mt-8 space-y-6 text-[15px] leading-relaxed text-[#3a3935]">
            {children}
          </div>
        </article>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 bg-white border-t border-black/[0.08] text-center text-[12px] text-[#9e9d99]">
        <div className="space-x-3 mb-3">
          <Link to="/cgu" className="text-[#555450] hover:text-[#1a1916] font-medium">Conditions d'utilisation</Link>
          <span>·</span>
          <Link to="/confidentialite" className="text-[#555450] hover:text-[#1a1916] font-medium">Confidentialité</Link>
          <span>·</span>
          <Link to="/" className="text-[#555450] hover:text-[#1a1916] font-medium">Accueil</Link>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} />
          © {new Date().getFullYear()} Itinéo · Tous droits réservés
        </div>
      </footer>
    </div>
  )
}

/** Titre de section interne (h2). */
export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[#1a1916] mb-2">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
