// src/features/superadmin/SuperAdminActivityPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, Search, Filter, ChevronLeft, ChevronRight,
  Building2, User, Clock, Loader2,
} from 'lucide-react'
import { api } from '../../lib/axios'

type Log = {
  id: number
  agency_id: number | null
  user_id: number | null
  action: string
  model_type: string | null
  model_id: number | null
  description: string
  created_at: string
  user: { id: number; nom: string; prenom: string; email: string } | null
  agency: { id: number; name: string; ref_prefix: string; logo_url: string | null } | null
}

type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

type Agency = {
  id: number
  name: string
  ref_prefix: string
}

function fromNow(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `il y a ${sec}s`
  if (sec < 3600) return `il y a ${Math.floor(sec / 60)}min`
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)}h`
  if (sec < 604800) return `il y a ${Math.floor(sec / 86400)}j`
  return d.toLocaleDateString('fr-FR')
}

const ACTION_COLORS: Record<string, string> = {
  create:      'bg-emerald-50 text-emerald-700',
  update:      'bg-blue-50 text-blue-700',
  delete:      'bg-rose-50 text-rose-700',
  login:       'bg-indigo-50 text-indigo-700',
  agency_update: 'bg-violet-50 text-violet-700',
  agency_logo_upload: 'bg-amber-50 text-amber-700',
}

function actionColor(action: string): string {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action.includes(key)) return ACTION_COLORS[key]
  }
  return 'bg-gray-100 text-gray-700'
}

export default function SuperAdminActivityPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [agencyFilter, setAgencyFilter] = useState<string>('')

  // Liste des agences pour le filtre
  const { data: agenciesData } = useQuery<{ data: Agency[] }>({
    queryKey: ['super-admin', 'agencies', 'minimal'],
    queryFn: async () => (await api.get('/super-admin/agencies', { params: { per_page: 100 } })).data,
  })

  const { data, isLoading, isFetching } = useQuery<Paginated<Log>>({
    queryKey: ['super-admin', 'activity', page, search, agencyFilter],
    queryFn: async () => {
      const params: any = { page }
      if (search) params.search = search
      if (agencyFilter) params.agency_id = agencyFilter
      return (await api.get('/activity-logs', { params })).data
    },
  })

  const logs = data?.data ?? []
  const agencies = agenciesData?.data ?? []

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Activity size={22} className="text-red-600" />
          Logs cross-agences
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Audit complet de l'activité sur toutes les agences de la plateforme.
        </p>
      </div>

      {/* ─── Filtres ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher dans les descriptions, utilisateurs…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
          />
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={agencyFilter}
            onChange={(e) => { setAgencyFilter(e.target.value); setPage(1) }}
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
          >
            <option value="">Toutes les agences</option>
            {agencies.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.ref_prefix})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Liste des logs ─── */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-gray-400">Aucun log trouvé.</div>
      ) : (
        <div className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/30 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-2.5">Quand</th>
                <th className="text-left px-4 py-2.5">Agence</th>
                <th className="text-left px-4 py-2.5">Utilisateur</th>
                <th className="text-left px-4 py-2.5">Action</th>
                <th className="text-left px-4 py-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      {fromNow(log.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.agency ? (
                      <div className="inline-flex items-center gap-1.5">
                        {log.agency.logo_url ? (
                          <img src={log.agency.logo_url} alt={log.agency.name} className="w-5 h-5 rounded object-contain bg-gray-50" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-gray-100 text-[8px] font-bold text-gray-500 flex items-center justify-center">
                            {log.agency.ref_prefix}
                          </div>
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                          {log.agency.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.user ? (
                      <div className="inline-flex items-center gap-1.5">
                        <User size={11} className="text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                          {log.user.prenom} {log.user.nom}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300">Système</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`inline-flex px-2 py-0.5 rounded-md font-mono text-[12px] font-semibold ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-md truncate">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            Page <strong>{data.current_page}</strong> sur {data.last_page} — {data.total} log{data.total > 1 ? 's' : ''} au total
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(data.last_page, p + 1))}
              disabled={page === data.last_page || isFetching}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
