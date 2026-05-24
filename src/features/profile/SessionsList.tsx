// src/features/profile/SessionsList.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import {
  Monitor, Smartphone, Tablet, Globe, Loader2, LogOut,
  CheckCircle2, Clock, Trash2, MapPin, ShieldAlert,
} from 'lucide-react'

type Session = {
  id: number
  name: string
  user_agent: string | null
  ip_address: string | null
  last_used_at: string | null
  created_at: string
  is_current: boolean
  device: string
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'Jamais utilisée'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'Date inconnue'
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 60) return "À l'instant"
  if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 604800) return `Il y a ${Math.floor(diffSec / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deviceIcon(ua?: string | null) {
  const u = (ua || '').toLowerCase()
  if (/iphone|android.*mobile|mobile/i.test(u)) return <Smartphone size={16} />
  if (/ipad|tablet/i.test(u)) return <Tablet size={16} />
  if (/mozilla|chrome|firefox|safari|edge|opera/i.test(u)) return <Monitor size={16} />
  return <Globe size={16} />
}

export default function SessionsList() {
  const qc = useQueryClient()
  const toast = useToast()
  const [confirmRevoke, setConfirmRevoke] = useState<{ id?: number; device?: string }>({})
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)

  const qSessions = useQuery({
    queryKey: ['me', 'sessions'],
    queryFn: async () => {
      const { data } = await api.get('/me/sessions')
      return (data?.sessions ?? []) as Session[]
    },
    staleTime: 30_000,
  })

  const mRevoke = useMutation({
    mutationFn: (id: number) => api.delete(`/me/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'sessions'] })
      toast.push({ title: 'Session révoquée ✓', tone: 'success' })
      setConfirmRevoke({})
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Erreur lors de la révocation', tone: 'error' })
      setConfirmRevoke({})
    },
  })

  const mRevokeAll = useMutation({
    mutationFn: () => api.delete('/me/sessions'),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['me', 'sessions'] })
      toast.push({ title: res?.data?.message || 'Sessions révoquées ✓', tone: 'success' })
      setConfirmRevokeAll(false)
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Erreur', tone: 'error' })
      setConfirmRevokeAll(false)
    },
  })

  const sessions = qSessions.data ?? []
  const otherCount = sessions.filter((s) => !s.is_current).length

  return (
    <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert size={14} className="text-amber-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sessions actives</div>
            <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
              Appareils connectés à votre compte
            </div>
          </div>
        </div>
        {otherCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmRevokeAll(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-500/15 transition shrink-0"
          >
            <LogOut size={11} />
            Déconnecter les autres
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
        {qSessions.isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 dark:text-gray-500 text-sm gap-2">
            <Loader2 size={14} className="animate-spin" />
            Chargement…
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Aucune session active.
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={[
                'flex items-start gap-3 px-4 py-3 transition-colors',
                s.is_current ? 'bg-emerald-50/40 dark:bg-emerald-500/[0.04]' : 'hover:bg-gray-50/40 dark:hover:bg-white/[0.02]',
              ].join(' ')}
            >
              {/* Device icon */}
              <div className={[
                'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                s.is_current
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400',
              ].join(' ')}>
                {deviceIcon(s.user_agent)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {s.device}
                  </span>
                  {s.is_current && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={10} />
                      Cette session
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                  {s.ip_address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={9} />
                      {s.ip_address}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={9} />
                    {relativeTime(s.last_used_at || s.created_at)}
                  </span>
                </div>
                {s.user_agent && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate" title={s.user_agent}>
                    {s.user_agent}
                  </div>
                )}
              </div>

              {/* Revoke button */}
              {!s.is_current && (
                <button
                  type="button"
                  onClick={() => setConfirmRevoke({ id: s.id, device: s.device })}
                  disabled={mRevoke.isPending}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition disabled:opacity-40"
                  title="Révoquer cette session"
                >
                  <Trash2 size={11} />
                  Révoquer
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Confirm révoquer une session */}
      <ConfirmDialog
        open={!!confirmRevoke.id}
        title="Révoquer cette session ?"
        message={`L'appareil "${confirmRevoke.device || 'inconnu'}" sera déconnecté immédiatement.`}
        onCancel={() => setConfirmRevoke({})}
        onConfirm={() => { if (confirmRevoke.id) mRevoke.mutate(confirmRevoke.id) }}
      />

      {/* Confirm révoquer toutes les autres */}
      <ConfirmDialog
        open={confirmRevokeAll}
        title="Déconnecter tous les autres appareils ?"
        message={`Toutes vos sessions sur d'autres appareils seront déconnectées (${otherCount} session${otherCount > 1 ? 's' : ''}). Vous resterez connecté sur celle-ci.`}
        onCancel={() => setConfirmRevokeAll(false)}
        onConfirm={() => mRevokeAll.mutate()}
      />
    </div>
  )
}
