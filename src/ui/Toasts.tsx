import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

type Tone = 'success' | 'error' | 'info' | 'warning'

type Toast = {
  id: number
  title: string
  description?: string
  tone?: Tone
  duration?: number
}

type Ctx = { push: (t: Omit<Toast, 'id'>) => void }

const ToastCtx = React.createContext<Ctx | null>(null)
let nextId = 1

const CONFIG: Record<Tone, {
  icon: React.ReactNode
  badge: string
  badgeBg: string
  iconBg: string
  iconColor: string
  bar: string
  barBg: string
}> = {
  success: {
    icon: <CheckCircle2 size={20} />,
    badge: 'Succès',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    iconBg:  'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    bar: 'bg-emerald-500',
    barBg: 'bg-emerald-500/10',
  },
  error: {
    icon: <XCircle size={20} />,
    badge: 'Erreur',
    badgeBg: 'bg-red-500/10 text-red-400',
    iconBg:  'bg-red-500/10',
    iconColor: 'text-red-400',
    bar: 'bg-red-500',
    barBg: 'bg-red-500/10',
  },
  info: {
    icon: <Info size={20} />,
    badge: 'Info',
    badgeBg: 'bg-sky-500/10 text-sky-400',
    iconBg:  'bg-sky-500/10',
    iconColor: 'text-sky-400',
    bar: 'bg-sky-500',
    barBg: 'bg-sky-500/10',
  },
  warning: {
    icon: <AlertTriangle size={20} />,
    badge: 'Attention',
    badgeBg: 'bg-amber-500/10 text-amber-400',
    iconBg:  'bg-amber-500/10',
    iconColor: 'text-amber-400',
    bar: 'bg-amber-500',
    barBg: 'bg-amber-500/10',
  },
}

const ToastItem = React.forwardRef<HTMLDivElement, { toast: Toast; onRemove: (id: number) => void }>(
  function ToastItem({ toast, onRemove }, _ref) {
  const tone     = toast.tone ?? 'info'
  const duration = toast.duration ?? 4500
  const cfg      = CONFIG[tone]

  const [progress, setProgress] = React.useState(100)
  const rafRef   = useRef<number>(0)
  const startRef = useRef<number>(Date.now())

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onRemove(toast.id)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1,  y: 0,   scale: 1    }}
      exit={{    opacity: 0,  y: -12, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c2333] shadow-2xl"
    >
      {/* Body */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Icône */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg} ${cfg.iconColor}`}>
          {cfg.icon}
        </div>

        {/* Texte */}
        <div className="min-w-0 flex-1">
          <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${cfg.badgeBg}`}>
            {cfg.badge}
          </span>
          <p className="text-sm font-semibold leading-snug text-white">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {toast.description}
            </p>
          )}
        </div>

        {/* Fermer */}
        <button
          onClick={() => onRemove(toast.id)}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
        >
          <X size={15} />
        </button>
      </div>

      {/* Barre de progression */}
      <div className={`mx-4 mb-3 h-1 rounded-full ${cfg.barBg}`}>
        <div
          className={`h-full rounded-full ${cfg.bar} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  )
})

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = React.useState<Toast[]>([])

  const push = (t: Omit<Toast, 'id'>) => {
    const id = nextId++
    setItems((s) => [...s, { id, ...t }])
  }

  const remove = (id: number) => setItems((s) => s.filter((x) => x.id !== id))

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {createPortal(
        <div className="fixed right-5 top-5 z-[9999] flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {items.map((t) => (
              <ToastItem key={t.id} toast={t} onRemove={remove} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => {
  const ctx = React.useContext(ToastCtx)
  if (!ctx) throw new Error('useToast outside provider')
  return ctx
}
