// src/features/home/HomePage.tsx
import { useState, useEffect, useRef, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, ShieldCheck, FileText, CreditCard, Users,
  CalendarCheck, TrendingUp, Bell, ArrowRight,
  Briefcase, Globe2, Building, UserCheck,
  HelpCircle, MessageCircle, Lock, Zap, BookOpen, Sparkles,
} from 'lucide-react'
import AccessRequestModal from './AccessRequestModal'
import { AGENCY, agencyWhatsAppUrl } from '../../lib/agencyConfig'

// ─── Hook : reveal-on-scroll via IntersectionObserver ───────────────────────
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const MockCard = ({ label, value, unit, trend, delay = 0 }: { label: string; value: string; unit?: string; trend: string; delay?: number }) => (
  <div
    className="bg-[#fcfcfc] rounded-lg p-2.5 border border-black/[0.06] text-left opacity-0 animate-count-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="text-[9px] text-[#9e9d99] uppercase tracking-[0.07em] font-semibold">{label}</div>
    <div className="text-[16px] sm:text-[18px] font-light tracking-[-0.02em] mt-1 text-[#1a1916] tabular-nums">
      {value}
      {unit && <span className="text-[10px] text-[#9e9d99] ml-1 font-normal">{unit}</span>}
    </div>
    <div className="text-[9px] text-emerald-600 mt-0.5 font-semibold inline-flex items-center gap-1">
      <TrendingUp size={9} />
      {trend}
    </div>
  </div>
)

const MockTableRow = ({
  avatar, color, name, reference, amount, tone, status, delay = 0,
}: {
  avatar: string
  color: string
  name: string
  reference: string
  amount: string
  tone: 'ok' | 'warn' | 'info'
  status: string
  delay?: number
}) => {
  const pillCls = tone === 'ok'
    ? 'bg-emerald-500/15 text-emerald-600'
    : tone === 'warn'
    ? 'bg-amber-500/20 text-amber-700'
    : 'bg-sky-500/15 text-sky-600'
  return (
    <div
      className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-1.5 px-2.5 py-1.5 border-b border-black/[0.05] last:border-b-0 text-[10.5px] items-center opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className={`w-5 h-5 rounded-full ${color} text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
          {avatar}
        </span>
        <span className="truncate text-[#1a1916]">{name}</span>
      </span>
      <span className="font-mono text-[9.5px] text-[#9e9d99] truncate">{reference}</span>
      <span className="font-mono text-[10px] font-semibold text-[#1a1916]">{amount}</span>
      <span>
        <span className={`inline-block px-1.5 py-px rounded-full text-[9px] font-semibold ${pillCls}`}>{status}</span>
      </span>
    </div>
  )
}

const FloatingMockToast = ({
  className, icon, tone, title, sub, delay = 0,
}: {
  className: string
  icon: ReactNode
  tone: 'emerald' | 'sky'
  title: string
  sub: string
  delay?: number
}) => {
  const toneCls = tone === 'emerald'
    ? 'bg-emerald-100 text-emerald-600'
    : 'bg-sky-100 text-sky-600'
  return (
    <div
      className={`${className} bg-white border border-black/[0.08] rounded-xl px-3 py-2.5 items-center gap-2.5 opacity-0 animate-fade-in-up`}
      style={{
        boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
        animationDelay: `${delay}ms`,
      }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${toneCls}`}>
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-[11.5px] font-semibold text-[#1a1916] whitespace-nowrap">{title}</div>
        <div className="text-[10px] text-[#9e9d99] mt-px whitespace-nowrap">{sub}</div>
      </div>
    </div>
  )
}

const Feature = ({ icon, title, desc, idx = 0 }: { icon: ReactNode; title: string; desc: string; idx?: number }) => {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={[
        'group bg-white border border-black/[0.08] rounded-2xl p-6 transition-all duration-500',
        'hover:border-[#F07A1C]/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(240,122,28,0.18)]',
        'relative overflow-hidden',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
      ].join(' ')}
      style={{ transitionDelay: visible ? `${idx * 80}ms` : '0ms' }}
    >
      {/* Glow effect on hover */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-[#F07A1C]/0 to-[#F07A1C]/0 group-hover:from-[#F07A1C]/15 group-hover:to-[#F07A1C]/5 blur-2xl transition-all duration-700" />

      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F07A1C]/10 to-[#F07A1C]/5 text-[#F07A1C] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
          {icon}
        </div>
        <div className="text-[15px] font-semibold text-[#1a1916] mb-1.5 tracking-[-0.005em]">{title}</div>
        <div className="text-[13px] text-[#555450] leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

const Audience = ({ icon, title, desc, idx = 0 }: { icon: ReactNode; title: string; desc: string; idx?: number }) => {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={[
        'group bg-white border border-black/[0.08] rounded-2xl p-6 text-center transition-all duration-500',
        'hover:border-[#F07A1C]/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(240,122,28,0.18)]',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
      ].join(' ')}
      style={{ transitionDelay: visible ? `${idx * 100}ms` : '0ms' }}
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#F07A1C]/15 to-[#F07A1C]/5 text-[#F07A1C] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="text-[14.5px] font-semibold text-[#1a1916] mb-1.5">{title}</div>
      <div className="text-[12.5px] text-[#555450] leading-relaxed">{desc}</div>
    </div>
  )
}

const Faq = ({ icon, question, answer, idx = 0 }: { icon: ReactNode; question: string; answer: string; idx?: number }) => {
  const { ref, visible } = useReveal()
  return (
    <details
      ref={ref as any}
      className={[
        'group bg-white border border-black/[0.08] rounded-xl overflow-hidden transition-all duration-500',
        'hover:border-[#F07A1C]/40 hover:shadow-sm',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      ].join(' ')}
      style={{ transitionDelay: visible ? `${idx * 60}ms` : '0ms' }}
    >
      <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none">
        <span className="w-8 h-8 rounded-lg bg-[#F07A1C]/10 text-[#F07A1C] flex items-center justify-center shrink-0 group-open:bg-[#F07A1C] group-open:text-white transition-colors">
          {icon}
        </span>
        <span className="flex-1 text-[14px] font-semibold text-[#1a1916]">{question}</span>
        <ChevronRight
          size={16}
          className="text-[#9e9d99] shrink-0 transition-transform duration-300 group-open:rotate-90 group-open:text-[#F07A1C]"
        />
      </summary>
      <div className="px-5 pb-4 pl-[60px] text-[13px] text-[#555450] leading-relaxed">{answer}</div>
    </details>
  )
}

// ─── FloatCard : double wrapper pour éviter le conflit entrée+float sur la même div
// outer = positionnement absolu + animation d'entrée (scale-in) — utilise display block (pas flex)
// inner = animation flottante en boucle (float) — auto width via block + inline-block content
const FloatCard = ({
  children, className = '', style, floatDelay = '0s', delay = 0,
}: {
  children: ReactNode
  /** Doit inclure positionnement (absolute, top/left), visibilité responsive (hidden md:block) et l'animation float (animate-float / animate-float-slow) */
  className?: string
  style?: React.CSSProperties
  /** Délai pour la boucle de flottement (CSS animation-delay sur l'inner) */
  floatDelay?: string
  /** Délai d'entrée scale-in (en ms) */
  delay?: number
}) => {
  // Isole l'animation flottante : elle s'applique sur l'inner, pas sur l'outer
  const isFloatSlow = className.includes('animate-float-slow')
  const isFloat = !isFloatSlow && className.includes('animate-float')
  const innerAnim = isFloatSlow ? 'animate-float-slow' : isFloat ? 'animate-float' : ''
  const outerClass = className.replace(/animate-float-slow|animate-float/g, '').trim()

  return (
    <div
      className={`opacity-0 animate-scale-in ${outerClass}`}
      style={{
        animationDelay: `${delay}ms`,
        filter: 'drop-shadow(0 18px 35px rgba(5,36,104,0.10)) drop-shadow(0 6px 14px rgba(0,0,0,0.04))',
        ...style,
      }}
    >
      <div
        className={`inline-block transition-transform duration-300 hover:scale-105 hover:z-20 ${innerAnim}`}
        style={innerAnim ? { animationDelay: floatDelay } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Section wrapper avec reveal animation ──────────────────────────────────
const RevealSection = ({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) => {
  const { ref, visible } = useReveal()
  return (
    <section
      ref={ref}
      id={id}
      className={[
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function HomePage() {
  const [accessOpen, setAccessOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Détection scroll pour la nav (effet "compact" au scroll)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1a1916] overflow-hidden">

      {/* ═══════════════════ BACKGROUND DÉCORATIF ═══════════════════ */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Blob orange en haut */}
        <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full opacity-30 animate-float-slow"
          style={{ background: 'radial-gradient(circle, #F07A1C 0%, transparent 65%)' }} />
        {/* Blob navy en bas */}
        <div className="absolute bottom-[20%] -left-32 w-[600px] h-[600px] rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(circle, #052468 0%, transparent 65%)', animationDelay: '2s' }} />
        {/* Grain subtil */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'a\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23a)\' /%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* ═══════════════════ NAV STICKY ═══════════════════ */}
      <nav
        className={[
          'sticky top-0 z-50 px-6 sm:px-10 transition-all duration-300',
          scrolled
            ? 'py-2.5 bg-white/95 border-b border-black/[0.08] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]'
            : 'py-4 bg-white/80',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2.5 animate-fade-in-down">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F07A1C] to-[#c84a14] text-white font-bold text-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(240,122,28,0.25)]">
              UT
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-bold text-[#1a1916] tracking-[-0.015em]">Universal Tours</div>
              <div className="text-[10.5px] text-[#9e9d99] mt-px">Agence de voyage</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 animate-fade-in-down" style={{ animationDelay: '100ms' }}>
            {[
              { href: '#features', label: 'Fonctionnalités' },
              { href: '#audience', label: 'Pour qui ?' },
              { href: '#help',     label: 'Aide' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] text-[#555450] hover:text-[#1a1916] font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-black/[0.04]"
              >
                {l.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => setAccessOpen(true)}
              className="text-[13px] text-[#555450] hover:text-[#1a1916] font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-black/[0.04]"
            >
              Contact
            </button>
          </div>

          <div className="flex items-center gap-2 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
            <Link
              to="/login"
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-[#F07A1C] to-[#c84a14] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(240,122,28,0.25)] hover:shadow-[0_8px_24px_rgba(240,122,28,0.4)] hover:-translate-y-px transition-all"
            >
              Se connecter
              <ChevronRight size={12} className="stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO (style Zapeo : cartes flottantes autour) ═══════════════════ */}
      <section className="relative px-6 sm:px-10 pt-12 sm:pt-16 pb-20 sm:pb-32 overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 1100px 600px at center top, rgba(240,122,28,0.08), transparent 60%)' }}
      >
        <div className="relative max-w-[1280px] mx-auto min-h-[640px] lg:min-h-[760px]">

          {/* ─── Contenu central (titre + sub + CTAs) ─── */}
          <div className="relative z-10 max-w-[760px] mx-auto text-center pt-8 sm:pt-12">

            {/* Trustpilot-style badge */}
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-black/[0.08] mb-7 shadow-[0_4px_12px_rgba(0,0,0,0.04)] opacity-0 animate-fade-in-up"
              style={{ animationDelay: '0ms' }}
            >
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold">Excellent</span>
              <span className="inline-flex items-center gap-0.5">
                {[0,1,2,3,4].map((i) => (
                  <span key={i} className="inline-flex items-center justify-center w-[18px] h-[18px] bg-emerald-500 rounded">
                    <svg viewBox="0 0 24 24" width="11" height="11" className="fill-white"><polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" /></svg>
                  </span>
                ))}
              </span>
              <span className="text-[10.5px] font-semibold text-[#1a1916] px-1">★ Trustpilot</span>
            </div>

            {/* Title */}
            <h1
              className="text-[42px] sm:text-[60px] lg:text-[72px] font-bold leading-[1.02] tracking-[-0.035em] text-[#1a1916] mb-5 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '100ms' }}
            >
              La gestion de votre agence,<br />
              <span
                className="inline-block bg-clip-text text-transparent animate-gradient-pan"
                style={{
                  backgroundImage: 'linear-gradient(110deg, #F07A1C 0%, #c84a14 25%, #052468 60%, #F07A1C 100%)',
                  backgroundSize: '300% 100%',
                }}
              >
                enfin simplifiée.
              </span>
            </h1>

            {/* Sub */}
            <p
              className="text-[15px] sm:text-[17px] text-[#555450] leading-relaxed max-w-[560px] mx-auto mb-9 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              Réservations, clients, factures et paiements — tout réuni dans une seule interface moderne,
              conçue pour faire gagner du temps à vos équipes.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-wrap items-center justify-center gap-3 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-br from-[#F07A1C] to-[#c84a14] text-white font-semibold text-[14.5px] shadow-[0_10px_30px_rgba(240,122,28,0.35)] hover:shadow-[0_14px_40px_rgba(240,122,28,0.5)] hover:-translate-y-0.5 transition-all"
              >
                Commencer maintenant
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                type="button"
                onClick={() => setAccessOpen(true)}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#1a1916] border border-black/[0.14] font-medium text-[14.5px] hover:bg-black/[0.02] hover:border-[#1a1916] hover:-translate-y-0.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              >
                Demander un accès
              </button>
            </div>

            {/* Trust strip */}
            <div
              className="mt-10 flex items-center justify-center gap-2 text-[11px] text-[#9e9d99] opacity-0 animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <Lock size={11} />
              <span>Connexion sécurisée · Données hébergées en Europe · RGPD compatible</span>
            </div>
          </div>

          {/* ─── Cartes flottantes éparpillées autour ─── */}

          {/* Top-left : Client VIP avec note */}
          <FloatCard
            className="hidden lg:block absolute top-[160px] left-[2%] xl:left-[8%] animate-float"
            floatDelay="0.8s"
            delay={600}
          >
            <div className="flex items-center gap-2.5 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl pl-3 pr-4 py-2.5 border border-white">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">FD</div>
              <div className="leading-tight">
                <div className="text-[12px] font-bold text-[#1a1916] flex items-center gap-1.5">
                  Fatou Diop
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                    <svg viewBox="0 0 24 24" width="10" height="10" className="fill-amber-500"><polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" /></svg>
                    4.9
                  </span>
                </div>
                <div className="text-[10px] text-[#555450] flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-px rounded-full bg-purple-500 text-white text-[9px] font-semibold">+12</span>
                  voyages
                </div>
              </div>
            </div>
          </FloatCard>

          {/* Top-right : Agents en ligne */}
          <FloatCard
            className="hidden lg:block absolute top-[140px] right-[2%] xl:right-[8%] animate-float-slow"
            floatDelay="1.2s"
            delay={750}
          >
            <div className="bg-white rounded-2xl px-4 py-3 border border-black/[0.06]">
              <div className="text-[10px] font-semibold text-[#9e9d99] uppercase tracking-wider mb-2">Agents en ligne</div>
              <div className="flex items-center -space-x-2 mb-2">
                {[
                  { bg: 'bg-sky-500', t: 'AD' },
                  { bg: 'bg-emerald-500', t: 'FN' },
                  { bg: 'bg-amber-500', t: 'MS' },
                  { bg: 'bg-rose-500', t: 'AS' },
                ].map((a, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${a.bg} ring-2 ring-white text-white text-[9px] font-bold flex items-center justify-center`}>{a.t}</div>
                ))}
                <div className="w-7 h-7 rounded-full bg-gray-100 ring-2 ring-white text-[#555450] text-[9px] font-bold flex items-center justify-center ml-1">+3</div>
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />
                </span>
                7 disponibles
              </div>
            </div>
          </FloatCard>

          {/* Middle-left : Activité réservations (donut SVG) */}
          <FloatCard
            className="hidden lg:block absolute top-[380px] left-[2%] xl:left-[5%] animate-float"
            floatDelay="0.4s"
            delay={900}
          >
            <div className="bg-white rounded-2xl p-4 border border-black/[0.06] w-[230px]">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarCheck size={12} className="text-sky-500" />
                <span className="text-[11px] font-semibold text-[#1a1916]">Réservations du mois</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2.5">
                <span className="text-[26px] font-bold text-[#1a1916] tabular-nums">4,38K</span>
                <span className="text-[10px] font-semibold text-emerald-600">↑ +22.4%</span>
              </div>
              {/* Donut SVG */}
              <div className="relative w-[120px] h-[60px] mx-auto">
                <svg viewBox="0 0 120 60" className="w-full h-full">
                  {/* Background semi-circle */}
                  <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
                  {/* Active arc (orange) ~ 60% */}
                  <path d="M 10 55 A 50 50 0 0 1 73 11" fill="none" stroke="#F07A1C" strokeWidth="10" strokeLinecap="round" />
                  {/* Yellow segment */}
                  <path d="M 73 11 A 50 50 0 0 1 95 22" fill="none" stroke="#fbbf24" strokeWidth="10" strokeLinecap="round" />
                  {/* Sky segment */}
                  <path d="M 95 22 A 50 50 0 0 1 110 55" fill="none" stroke="#3CC5F6" strokeWidth="10" strokeLinecap="round" />
                  <text x="60" y="48" textAnchor="middle" className="font-bold fill-[#1a1916]" style={{ fontSize: '15px' }}>17%</text>
                  <text x="60" y="58" textAnchor="middle" className="fill-[#9e9d99]" style={{ fontSize: '7px' }}>conversion</text>
                </svg>
              </div>
              <div className="flex items-center justify-center gap-3 mt-1 text-[8.5px] text-[#555450]">
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F07A1C]" />Avion</span>
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Hôtel</span>
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Forfait</span>
              </div>
            </div>
          </FloatCard>

          {/* Middle-right : Agent contact */}
          <FloatCard
            className="hidden lg:block absolute top-[400px] right-[2%] xl:right-[5%] animate-float-slow"
            floatDelay="0.6s"
            delay={1050}
          >
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-black/[0.06]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm">AS</div>
              <div className="leading-tight">
                <div className="text-[12.5px] font-bold text-[#1a1916]">Aminata Sarr</div>
                <div className="text-[10px] text-[#9e9d99]">Agente senior · Dakar</div>
              </div>
              <div className="flex items-center gap-1 ml-1">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center"><MessageCircle size={12} className="text-amber-600" /></div>
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="12" height="12" className="stroke-sky-600" strokeWidth="2" fill="none" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
              </div>
            </div>
          </FloatCard>

          {/* Bottom-left : Liste clients récents (style Zapeo subscribers) */}
          <FloatCard
            className="hidden xl:block absolute bottom-[40px] left-[2%] animate-float"
            floatDelay="1s"
            delay={1200}
          >
            <div className="bg-white rounded-2xl p-3 border border-black/[0.06] w-[240px]">
              <div className="flex items-center gap-2 mb-2 px-1">
                <button className="text-[10px] font-bold text-[#1a1916] inline-flex items-center gap-1">
                  Clients
                  <span className="text-[9px] text-[#9e9d99] bg-gray-100 rounded-full px-1.5 py-px">28</span>
                </button>
                <button className="text-[10px] font-medium text-[#9e9d99] inline-flex items-center gap-1">
                  À relancer
                  <span className="text-[9px] text-white bg-rose-500 rounded-full px-1.5 py-px">9</span>
                </button>
              </div>
              <div className="space-y-1">
                {[
                  { name: 'Georges Jones', handle: '@george', color: 'bg-gray-200', tone: 'normal' },
                  { name: 'Noah Smith',    handle: '@noah',   color: 'bg-purple-500', text: 'text-white', tone: 'check' },
                  { name: 'James Mark',    handle: '@james',  color: 'bg-purple-500', text: 'text-white', tone: 'check' },
                  { name: 'Oliver Taylor', handle: '@otaylor', color: 'bg-gray-200', tone: 'expired' },
                  { name: 'Sarah Walker',  handle: '@sarah',  color: 'bg-purple-500', text: 'text-white', tone: 'check' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-1 py-1 rounded">
                    <div className={`w-4 h-4 rounded border ${c.tone === 'check' ? c.color + ' ' + (c.text || '') : 'bg-white border-gray-300'} flex items-center justify-center shrink-0`}>
                      {c.tone === 'check' && <svg viewBox="0 0 12 12" width="9" height="9" className="stroke-white" strokeWidth="2.5" fill="none" strokeLinecap="round"><polyline points="2,6 5,9 10,3" /></svg>}
                    </div>
                    <span className="text-[10.5px] font-medium text-[#1a1916] truncate flex-1">{c.name}</span>
                    <span className="text-[9px] text-[#9e9d99] truncate">{c.handle}</span>
                    {c.tone === 'expired' && <span className="text-[8.5px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-px rounded">Expiré</span>}
                  </div>
                ))}
              </div>
            </div>
          </FloatCard>

          {/* Bottom-right : CA encaissé (bar chart) */}
          <FloatCard
            className="hidden xl:block absolute bottom-[40px] right-[2%] animate-float-slow"
            floatDelay="0.2s"
            delay={1350}
          >
            <div className="bg-white rounded-2xl p-4 border border-black/[0.06] w-[230px]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={12} className="text-[#F07A1C]" />
                <span className="text-[11px] font-semibold text-[#1a1916]">CA encaissé</span>
              </div>
              <div className="text-[22px] font-bold text-[#1a1916] tabular-nums mb-0.5">19 173 €</div>
              <div className="text-[9px] text-[#9e9d99] mb-2">CA moyen mensuel</div>
              {/* Bar chart SVG */}
              <div className="flex items-end gap-1.5 h-[60px]">
                {[40, 30, 50, 75, 95, 55, 45].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${i === 4 ? 'bg-[#F07A1C]' : 'bg-gray-200'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-1 mt-1.5 text-[8.5px] text-[#9e9d99]">
                <span>Jan</span><span>Fév</span><span>Mar</span><span className="text-[#F07A1C] font-bold">Avr</span><span>Mai</span><span>Juin</span><span>Juil</span>
              </div>
            </div>
          </FloatCard>

          {/* Toasts compacts en mobile (fallback quand les cartes sont cachées) */}
          <div className="lg:hidden mt-12 flex flex-col gap-3 max-w-[420px] mx-auto">
            <FloatingMockToast
              className="flex relative !static"
              icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>}
              tone="emerald"
              title="Paiement reçu"
              sub="450 000 XOF · Amadou D."
              delay={600}
            />
            <FloatingMockToast
              className="flex relative !static"
              icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><path d="M21 7.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5"/><path d="m3 7.5 9 5 9-5"/></svg>}
              tone="sky"
              title="Nouvelle réservation"
              sub="DKR → CDG · 3 pax"
              delay={750}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ FONCTIONNALITÉS ═══════════════════ */}
      <RevealSection id="features" className="relative px-6 sm:px-10 py-20 sm:py-24 bg-white border-t border-black/[0.06]">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#F07A1C] uppercase tracking-[0.15em] font-bold mb-3">
              <Sparkles size={11} />
              Fonctionnalités
            </div>
            <h2 className="text-[32px] sm:text-[42px] font-light tracking-[-0.025em] leading-[1.1] text-[#1a1916] max-w-[680px] mx-auto mb-4">
              Tout ce dont votre agence a besoin,<br />
              <strong className="font-semibold">dans une seule app.</strong>
            </h2>
            <p className="text-[15px] text-[#555450] max-w-[580px] mx-auto leading-relaxed">
              De la première réservation au dernier paiement, gérez l'intégralité de votre activité depuis une plateforme unifiée.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature idx={0} icon={<CalendarCheck size={20} />} title="Réservations centralisées"
              desc="Billets d'avion, hôtels, voitures, e-visa, assurance, forfaits — tous types en un clic." />
            <Feature idx={1} icon={<FileText size={20} />} title="Facturation automatique"
              desc="Facture émise dès la création, suivi du paiement, relances factures impayées." />
            <Feature idx={2} icon={<CreditCard size={20} />} title="Paiements multi-modes"
              desc="Wave, Orange Money, espèces, virement, carte — tous les modes en un clic." />
            <Feature idx={3} icon={<Users size={20} />} title="Base clients enrichie"
              desc="Historique complet, avoirs, recherche instantanée par nom, email ou téléphone." />
            <Feature idx={4} icon={<TrendingUp size={20} />} title="Tableau de bord temps réel"
              desc="KPI clés, chiffre d'affaires, top services et alertes en un coup d'œil." />
            <Feature idx={5} icon={<Bell size={20} />} title="Notifications & alertes"
              desc="Suivez les paiements reçus, réservations confirmées et factures échues en temps réel." />
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════ POUR QUI ? ═══════════════════ */}
      <RevealSection id="audience" className="px-6 sm:px-10 py-20 sm:py-24 bg-[#fafaf9] border-t border-black/[0.06]">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#F07A1C] uppercase tracking-[0.15em] font-bold mb-3">
              <Briefcase size={11} />
              Pour qui ?
            </div>
            <h2 className="text-[32px] sm:text-[42px] font-light tracking-[-0.025em] leading-[1.1] text-[#1a1916] max-w-[680px] mx-auto mb-4">
              Conçue pour <strong className="font-semibold">les professionnels du voyage</strong>
            </h2>
            <p className="text-[15px] text-[#555450] max-w-[580px] mx-auto leading-relaxed">
              Que vous soyez agent indépendant ou agence avec plusieurs collaborateurs, Universal Tours s'adapte à votre structure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Audience idx={0} icon={<UserCheck size={22} />} title="Agents indépendants"
              desc="Lancez votre activité avec un outil pro dès le premier client. Aucun frais d'installation." />
            <Audience idx={1} icon={<Building size={22} />} title="Petites agences"
              desc="Centralisez les réservations de votre équipe, suivez les ventes et les paiements en temps réel." />
            <Audience idx={2} icon={<Briefcase size={22} />} title="Agences établies"
              desc="Gérez plusieurs agents avec des rôles différents (admin / employé) et un historique complet." />
            <Audience idx={3} icon={<Globe2 size={22} />} title="Tour-opérateurs"
              desc="Forfaits sur mesure, multi-bénéficiaires, gestion des participants — tout y est." />
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════ AIDE / FAQ ═══════════════════ */}
      <RevealSection id="help" className="px-6 sm:px-10 py-20 sm:py-24 bg-white border-t border-black/[0.06]">
        <div className="max-w-[920px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#F07A1C] uppercase tracking-[0.15em] font-bold mb-3">
              <HelpCircle size={11} />
              Aide & ressources
            </div>
            <h2 className="text-[32px] sm:text-[42px] font-light tracking-[-0.025em] leading-[1.1] text-[#1a1916] max-w-[680px] mx-auto mb-4">
              Tout ce qu'il faut savoir <strong className="font-semibold">avant de commencer.</strong>
            </h2>
            <p className="text-[15px] text-[#555450] max-w-[580px] mx-auto leading-relaxed">
              Les questions les plus fréquentes sur la plateforme — et comment nous contacter si besoin.
            </p>
          </div>

          <div className="space-y-3 mb-10">
            <Faq idx={0} icon={<Zap size={16} />} question="Comment obtenir un compte ?"
              answer="Cliquez sur « Demander un accès » : remplissez le formulaire (nom, email, agence). Notre équipe vous recontacte sous 24h ouvrées pour valider et vous fournir vos identifiants." />
            <Faq idx={1} icon={<BookOpen size={16} />} question="Quels types de réservations puis-je gérer ?"
              answer="Sept types : billets d'avion, hôtels, locations de voiture, événements, forfaits sur mesure, assurance voyage et e-visa. Chaque type a ses champs spécifiques et son flux de validation." />
            <Faq idx={2} icon={<CreditCard size={16} />} question="Quels modes de paiement sont supportés ?"
              answer="Espèces, Wave, Orange Money, virement bancaire et carte. La facture suit automatiquement le statut (impayée → partielle → payée) selon les paiements enregistrés." />
            <Faq idx={3} icon={<Lock size={16} />} question="Mes données sont-elles sécurisées ?"
              answer="Authentification via tokens Sanctum, mots de passe hachés (bcrypt), HTTPS obligatoire, journal d'activité de toutes les actions sensibles. Vos données restent hébergées sur nos serveurs uniquement." />
            <Faq idx={4} icon={<Users size={16} />} question="Combien d'utilisateurs puis-je créer ?"
              answer="Aucune limite côté technique. Vous gérez vos collaborateurs depuis la section « Utilisateurs » : ajout, désactivation, changement de rôle (admin / employé), réinitialisation du mot de passe." />
          </div>

          <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-br from-[#fafaf9] via-white to-[#fafaf9] p-7 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#F07A1C]/15 to-[#F07A1C]/5 text-[#F07A1C] flex items-center justify-center mb-4">
              <MessageCircle size={22} />
            </div>
            <div className="text-[17px] font-semibold text-[#1a1916] mb-1.5">Une autre question ?</div>
            <p className="text-[13.5px] text-[#555450] mb-5 max-w-[440px] mx-auto leading-relaxed">
              Notre équipe support est à votre écoute pour tout besoin spécifique ou demande d'information.
            </p>
            <button
              type="button"
              onClick={() => setAccessOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#1a1916] border border-black/[0.14] font-medium text-[13.5px] hover:bg-black/[0.02] hover:border-[#1a1916] hover:-translate-y-px transition-all shadow-sm"
            >
              <HelpCircle size={13} />
              Contacter le support
            </button>
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════ CTA FINAL ═══════════════════ */}
      <RevealSection id="cta" className="relative px-6 sm:px-10 py-20 sm:py-24 text-center text-white border-t border-black/[0.06] overflow-hidden">
        {/* Background gradient animé */}
        <div className="absolute inset-0 -z-10 animate-gradient-pan"
          style={{
            backgroundImage: 'linear-gradient(135deg, #052468 0%, #0b3aa3 35%, #1a3a8c 60%, #052468 100%)',
            backgroundSize: '200% 200%',
          }}
        />
        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-[10%] w-64 h-64 rounded-full bg-[#F07A1C]/20 blur-3xl animate-float-slow -z-10" />
        <div className="absolute bottom-1/4 right-[10%] w-72 h-72 rounded-full bg-[#3CC5F6]/15 blur-3xl animate-float -z-10" style={{ animationDelay: '3s' }} />

        <div className="max-w-[1120px] mx-auto relative">
          <h2 className="text-[32px] sm:text-[44px] font-light tracking-[-0.025em] leading-[1.1] text-white max-w-[640px] mx-auto mb-4">
            Prêt à <strong className="font-semibold">simplifier votre quotidien</strong> ?
          </h2>
          <p className="text-[15px] text-white/80 max-w-[520px] mx-auto mb-9 leading-relaxed">
            Connectez-vous dès maintenant à votre espace agent ou demandez un accès à votre administrateur.
          </p>
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-br from-[#F07A1C] to-[#c84a14] text-white font-semibold text-[15px] shadow-[0_12px_36px_rgba(240,122,28,0.45)] hover:shadow-[0_16px_50px_rgba(240,122,28,0.6)] hover:-translate-y-0.5 transition-all"
          >
            Commencer maintenant
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </RevealSection>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="px-6 sm:px-10 py-10 bg-white border-t border-black/[0.08] text-center text-[12px] text-[#9e9d99]">
        <div className="space-x-3 mb-3">
          <a href="#" className="text-[#555450] hover:text-[#1a1916] font-medium">Mentions légales</a>
          <span>·</span>
          <a href="#" className="text-[#555450] hover:text-[#1a1916] font-medium">Confidentialité</a>
          <span>·</span>
          <a href="#help" className="text-[#555450] hover:text-[#1a1916] font-medium">Aide</a>
          <span>·</span>
          <button type="button" onClick={() => setAccessOpen(true)} className="text-[#555450] hover:text-[#1a1916] font-medium">Contact</button>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} />
          © {new Date().getFullYear()} Universal Tours · Tous droits réservés
        </div>
      </footer>

      {/* ═══════════════════ MODAL DEMANDE D'ACCÈS ═══════════════════ */}
      <AccessRequestModal open={accessOpen} onClose={() => setAccessOpen(false)} />

      {/* ═══════════════════ BOUTON FLOTTANT WHATSAPP (Premium) ═══════════════════ */}
      <div className="fixed bottom-6 right-6 z-50 group">

        {/* Tooltip qui apparaît au hover */}
        <div className="absolute bottom-full right-0 mb-3 mr-1 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
          <div className="relative bg-white rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-black/[0.06] px-4 py-3 w-[240px]">
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white relative">
                <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
                </svg>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold text-[#1a1916] leading-tight">{AGENCY.name}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5 inline-flex items-center gap-1">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                    <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />
                  </span>
                  En ligne · Réponse rapide
                </div>
                <div className="text-[10.5px] text-[#555450] mt-1 leading-snug">
                  Discutons de votre projet de voyage !
                </div>
              </div>
            </div>
            {/* Flèche pointant vers le bouton */}
            <div className="absolute -bottom-1.5 right-7 w-3 h-3 bg-white rotate-45 border-r border-b border-black/[0.06]" />
          </div>
        </div>

        {/* Bouton principal */}
        <a
          href={agencyWhatsAppUrl(`Bonjour ${AGENCY.name}, j'aimerais avoir plus d'informations sur vos services.`)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Discuter sur WhatsApp · ${AGENCY.phone}`}
          className="relative block"
        >
          {/* Anneau pulsant (extérieur) */}
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25" />
          {/* Halo de fond animé (gradient en rotation) */}
          <span className="absolute -inset-1 rounded-full opacity-40 blur-md animate-gradient-pan"
            style={{
              background: 'conic-gradient(from 0deg, #10b981, #34d399, #10b981, #047857, #10b981)',
              backgroundSize: '200% 200%',
            }}
          />

          {/* Bouton */}
          <span className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.5)] group-hover:shadow-[0_16px_44px_rgba(16,185,129,0.7)] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
            <svg viewBox="0 0 24 24" width="26" height="26" className="fill-current drop-shadow-sm">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
            </svg>
          </span>

          {/* Badge "1" message (effet "nouveau message") */}
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
            1
          </span>
        </a>
      </div>
    </div>
  )
}
