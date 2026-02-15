import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../lib/axios'
import { Badge } from '../../ui/Badge'
import { Receipt, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

type DashboardPayload = {
  kpis?: {
    reservations_7d?: number
    ca_month?: number
    follow_count?: number
    clients_total?: number
    new_clients_month?: number
    range?: {
      start7?: string
      start30?: string
      monthStart?: string
      monthEnd?: string
    }
  }
  series?: {
    reservations_7d?: Array<{ date: string; label: string; value: number }>
    ca_30d?: Array<{ date: string; label: string; value: number }>
  }
  lists?: {
    last_reservations?: Array<{
      id: number
      created_at?: string
      statut?: string
      reference?: string
      client?: { prenom?: string; nom?: string; email?: string }
    }>
    factures_follow?: Array<{
      id: number
      numero?: string
      statut?: string
      montant_total?: number
      created_at?: string
    }>
  }
}

const moneyXOF = (n: any) => `${Number(n || 0).toLocaleString()} XOF`

const toneFacture = (s?: string) => (s === 'payee' ? 'green' : s === 'impayee' ? 'red' : 'amber')
const toneReservation = (s?: string) => (s === 'confirmee' ? 'green' : s === 'annulee' ? 'red' : 'amber')

export default function Dashboard() {
  const q = useQuery({
    queryKey: ['dashboard-v1'],
    queryFn: async () => {
      const { data } = await api.get<DashboardPayload>('/dashboard')
      return data
    },
    staleTime: 30_000,
  })

  const d = q.data

  const kpis = {
    r7: Number(d?.kpis?.reservations_7d ?? 0),
    caMonth: Number(d?.kpis?.ca_month ?? 0),
    followCount: Number(d?.kpis?.follow_count ?? 0),
    clientsTotal: Number(d?.kpis?.clients_total ?? 0),
    newClientsMonth: Number(d?.kpis?.new_clients_month ?? 0),
  }

  // ✅ sécurisation: series toujours un array
  const chartReservations7 = useMemo(() => d?.series?.reservations_7d ?? [], [d])
  const chartCA30 = useMemo(() => d?.series?.ca_30d ?? [], [d])

  const lastReservations = useMemo(() => d?.lists?.last_reservations ?? [], [d])
  const followTop = useMemo(() => d?.lists?.factures_follow ?? [], [d])

  const loading = q.isLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Synthèse — {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="flex gap-2">
          <Link className="btn bg-gray-200 dark:bg-white/10" to="/reservations">
            Voir réservations
          </Link>
          <Link className="btn-primary" to="/reservations">
            Nouvelle réservation
          </Link>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 w-28 bg-black/10 dark:bg-white/10 rounded" />
              <div className="h-8 w-40 bg-black/10 dark:bg-white/10 rounded mt-3" />
              <div className="h-3 w-24 bg-black/10 dark:bg-white/10 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Receipt size={16} className="opacity-70" /> Réservations
            </div>
            <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{kpis.r7}</div>
            <div className="text-xs text-gray-400 mt-1">7 derniers jours</div>
          </div>

          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <TrendingUp size={16} className="opacity-70" /> CA (mois)
            </div>
            <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{moneyXOF(kpis.caMonth)}</div>
            <div className="text-xs text-gray-400 mt-1">Factures payées</div>
          </div>

          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <AlertTriangle size={16} className="opacity-70" /> À suivre
            </div>
            <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{kpis.followCount}</div>
            <div className="text-xs text-gray-400 mt-1">Impayées / partielles (mois)</div>
          </div>

          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Users size={16} className="opacity-70" /> Clients
            </div>
            <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{kpis.clientsTotal}</div>
            <div className="text-xs text-gray-400 mt-1">+{kpis.newClientsMonth} ce mois</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-semibold mb-2">Réservations (7 jours)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartReservations7} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" stroke="currentColor" opacity={0.6} />
                <YAxis stroke="currentColor" opacity={0.6} allowDecimals={false} />
                <Tooltip formatter={(v: any) => String(v)} />
                <Area type="monotone" dataKey="value" stroke="var(--ut-sky)" fill="var(--ut-sky)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="font-semibold mb-2">Chiffre d’affaires (30 jours)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartCA30}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" stroke="currentColor" opacity={0.6} hide />
                <YAxis stroke="currentColor" opacity={0.6} />
                <Tooltip formatter={(v: any) => moneyXOF(v)} />
                <Area type="monotone" dataKey="value" stroke="var(--ut-orange)" fill="var(--ut-orange)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Dernières réservations</div>
            <Link to="/reservations" className="text-sm text-primary hover:underline">
              Tout voir
            </Link>
          </div>

          {lastReservations.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune réservation trouvée.</div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {lastReservations.map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.reference ? `Réservation ${r.reference}` : `Réservation #${r.id}`}</div>
                    <div className="text-xs text-gray-500 truncate">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</div>
                  </div>
                  <Badge tone={toneReservation(r.statut)}>{r.statut || '—'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Factures à suivre (mois)</div>
            <Link to="/factures" className="text-sm text-primary hover:underline">
              Tout voir
            </Link>
          </div>

          {followTop.length === 0 ? (
            <div className="text-sm text-gray-500">Rien à signaler 🎉</div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {followTop.map((f) => (
                <div key={f.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">Facture {f.numero ?? `#${f.id}`}</div>
                    <div className="text-xs text-gray-500 truncate">
                      Total: {moneyXOF(f.montant_total)} • {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <Badge tone={toneFacture(f.statut)}>{f.statut || '—'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error visible */}
      {q.isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          Impossible de charger le dashboard. Vérifie l’endpoint <code>/dashboard</code> côté API.
        </div>
      ) : null}
    </div>
  )
}
