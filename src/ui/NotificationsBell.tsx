import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, Calendar, CreditCard, FileText, Receipt, ShieldCheck, BarChart3, AlertCircle, Loader2 } from 'lucide-react'
import {
  useUnreadCount,
  useNotificationsList,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
  type AppNotification,
} from '../hooks/useNotifications'

// ─── Icon par type ────────────────────────────────────────────────────────────
function iconForType(type: string) {
  const cls = 'shrink-0'
  switch (type) {
    case 'reservation_created':   return <Calendar size={14} className={cls + ' text-sky-600 dark:text-sky-400'} />
    case 'reservation_confirmed': return <Calendar size={14} className={cls + ' text-emerald-600 dark:text-emerald-400'} />
    case 'reservation_cancelled': return <Calendar size={14} className={cls + ' text-rose-600 dark:text-rose-400'} />
    case 'payment_received':      return <CreditCard size={14} className={cls + ' text-emerald-600 dark:text-emerald-400'} />
    case 'invoice_paid':          return <Receipt size={14} className={cls + ' text-emerald-600 dark:text-emerald-400'} />
    case 'invoice_overdue':       return <AlertCircle size={14} className={cls + ' text-amber-600 dark:text-amber-400'} />
    case 'user_created':          return <ShieldCheck size={14} className={cls + ' text-indigo-600 dark:text-indigo-400'} />
    case 'daily_summary':         return <BarChart3 size={14} className={cls + ' text-gray-600 dark:text-gray-400'} />
    default:                      return <FileText size={14} className={cls + ' text-gray-600 dark:text-gray-400'} />
  }
}

// ─── Horodatage relatif (fr) ──────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 60) return "à l'instant"
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 604800) return `il y a ${Math.floor(diffSec / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Composant ────────────────────────────────────────────────────────────────
export const NotificationsBell: React.FC = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: list = [], isLoading } = useNotificationsList(open)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllRead()
  const remove = useDeleteNotification()

  // Fermeture au clic extérieur / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const handleClickNotif = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.url) {
      setOpen(false)
      navigate(n.url)
    }
  }

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--ut-orange)] text-white text-[9px] font-bold leading-none flex items-center justify-center">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-1rem)] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0d1321] shadow-xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <div className="flex items-center gap-2 min-w-0">
              <Bell size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold bg-[var(--ut-orange)]/10 text-[var(--ut-orange)] px-1.5 py-0.5 rounded-full">
                  {unreadCount} non-lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
                title="Tout marquer comme lu"
              >
                <CheckCheck size={12} />
                Tout lu
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Chargement…
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucune notification</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Vous êtes à jour.
                </div>
              </div>
            ) : (
              list.map((n) => {
                const isUnread = !n.read_at
                return (
                  <div
                    key={n.id}
                    className={[
                      'group flex items-start gap-2.5 px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.06] last:border-b-0 transition-colors cursor-pointer',
                      isUnread
                        ? 'bg-[var(--ut-orange)]/[0.04] hover:bg-[var(--ut-orange)]/[0.08]'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
                    ].join(' ')}
                    onClick={() => handleClickNotif(n)}
                  >
                    {/* Icon */}
                    <div className="mt-0.5">{iconForType(n.type)}</div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className={[
                          'text-[12.5px] leading-tight',
                          isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-600 dark:text-gray-300',
                        ].join(' ')}>
                          {n.title}
                        </div>
                        {isUnread && (
                          <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-[var(--ut-orange)]" aria-label="Non lu" />
                        )}
                      </div>
                      {n.body && (
                        <div className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {n.body}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(n.created_at)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); remove.mutate(n.id) }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer : lien vers la page complète */}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/notifications') }}
            className="w-full px-4 py-2.5 text-[12px] font-medium text-center text-gray-600 dark:text-gray-300 bg-gray-50/60 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] border-t border-black/[0.05] dark:border-white/[0.08] transition-colors"
          >
            Voir toutes les notifications →
          </button>
        </div>
      )}
    </div>
  )
}
