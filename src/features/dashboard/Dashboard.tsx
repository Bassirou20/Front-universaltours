import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../lib/axios'
import { Badge } from '../../ui/Badge'
import { Receipt, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

type Reservation = {
  id: number
  created_at?: string
  statut?: string
  total?: number
  client?: { prenom?: string; nom?: string; email?: string }
  client_id?: number
}

type Facture = {
  id: number
  numero?: string
  statut?: 'payee' | 'impayee' | 'partielle'
  total?: number
  created_at?: string
  due_date?: string
  reservation_id?: number
}

type Client = {
  id: number
  prenom?: string | null
  nom: string
  email?: string | null
  created_at?: string
}

type LaravelPage<T> = {
  data: T[]
  current_page: number
  last_page: number
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

const moneyXOF = (n: any) => `${Number(n || 0).toLocaleString()} XOF`

const toneFacture = (s?: string) => (s === 'payee' ? 'green' : s === 'impayee' ? 'red' : 'amber')

async function fetchAllPaged<T>(path: string, params?: any): Promise<T[]> {
  const all: T[] = []
  let page = 1
  let last = 1

  for (let guard = 0; guard < 60; guard++) {
    const { data } = await api.get(path, { params: { ...params, page, per_page: 100 } })

    // certains endpoints peuvent retourner array direct
    if (Array.isArray(data)) return data as T[]

    const lp = data as LaravelPage<T>
    const items = Array.isArray(lp?.data) ? lp.data : []
    all.push(...items)

    last = Number(lp?.last_page ?? 1)
    page = Number(lp?.current_page ?? page) + 1
    if (page > last) break
  }

  return all
}

export default function Dashboard() {
  const now = new Date()
  const today = startOfDay(now)

  // périodes
  const last7Start = new Date(today)
  last7Start.setDate(last7Start.getDate() - 6)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const last30Start = new Date(today)
  last30Start.setDate(last30Start.getDate() - 29)

  // --- Queries (sync API) ---
  const qReservations = useQuery({
    queryKey: ['dashboard', 'reservations-all'],
    queryFn: () => fetchAllPaged<Reservation>('/reservations'),
    staleTime: 30_000,
  })

  const qClients = useQuery({
    queryKey: ['dashboard', 'clients-all'],
    queryFn: () => fetchAllPaged<Client>('/clients'),
    staleTime: 60_000,
  })

  // Factures payées du mois (pour CA)
  const qFacturesPaidMonth = useQuery({
    queryKey: ['dashboard', 'factures-paid-month', isoDate(monthStart), isoDate(nextMonthStart)],
    queryFn: async () => {
      // backend supporte date_from/date_to/statut (déjà utilisé dans FacturesPage)
      const all: Facture[] = []
      let page = 1
      let last = 1
      for (let guard = 0; guard < 40; guard++) {
        const { data } = await api.get('/factures', {
          params: {
            page,
            per_page: 100,
            statut: 'payee',
            date_from: isoDate(monthStart),
            date_to: isoDate(nextMonthStart),
          },
        })
        // fromLaravel-like
        const items = Array.isArray(data?.data) ? data.data : []
        all.push(...items)
        last = Number(data?.last_page ?? 1)
        page = Number(data?.current_page ?? page) + 1
        if (page > last) break
      }
      return all
    },
    staleTime: 30_000,
  })

  // Factures à suivre (impayée/partielle) du mois (ou global)
  const qFacturesToFollow = useQuery({
    queryKey: ['dashboard', 'factures-follow', isoDate(monthStart), isoDate(nextMonthStart)],
    queryFn: async () => {
      // on récupère sur période mensuelle (plus utile), tu peux enlever la date si tu veux global
      const statuses: Array<'impayee' | 'partielle'> = ['impayee', 'partielle']
      const all: Facture[] = []

      for (const statut of statuses) {
        let page = 1
        let last = 1
        for (let guard = 0; guard < 40; guard++) {
          const { data } = await api.get('/factures', {
            params: {
              page,
              per_page: 100,
              statut,
              date_from: isoDate(monthStart),
              date_to: isoDate(nextMonthStart),
            },
          })
          const items = Array.isArray(data?.data) ? data.data : []
          all.push(...items)
          last = Number(data?.last_page ?? 1)
          page = Number(data?.current_page ?? page) + 1
          if (page > last) break
        }
      }

      // tri newest first
      all.sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0))
      return all
    },
    staleTime: 30_000,
  })

  // Factures payées (30 jours) pour courbe CA
  const qFacturesPaid30 = useQuery({
    queryKey: ['dashboard', 'factures-paid-30', isoDate(last30Start), isoDate(today)],
    queryFn: async () => {
      const all: Facture[] = []
      let page = 1
      let last = 1
      for (let guard = 0; guard < 60; guard++) {
        const { data } = await api.get('/factures', {
          params: {
            page,
            per_page: 100,
            statut: 'payee',
            date_from: isoDate(last30Start),
            date_to: isoDate(today),
          },
        })
        const items = Array.isArray(data?.data) ? data.data : []
        all.push(...items)
        last = Number(data?.last_page ?? 1)
        page = Number(data?.current_page ?? page) + 1
        if (page > last) break
      }
      return all
    },
    staleTime: 30_000,
  })

  const reservations = qReservations.data ?? []
  const clients = qClients.data ?? []
  const facturesPaidMonth = qFacturesPaidMonth.data ?? []
  const facturesFollow = qFacturesToFollow.data ?? []
  const facturesPaid30 = qFacturesPaid30.data ?? []

  // --- Derived metrics ---
  const kpis = useMemo(() => {
    // reservations 7 jours
    const r7 = reservations.filter((r) => {
      const d = r.created_at ? startOfDay(new Date(r.created_at)) : null
      return d ? d >= last7Start && d <= today : false
    }).length

    // CA mois: somme factures payées
    const caMonth = facturesPaidMonth.reduce((sum, f) => sum + Number(f.total || 0), 0)

    // factures à suivre
    const followCount = facturesFollow.length

    // clients total + nouveaux ce mois
    const newClientsMonth = clients.filter((c) => {
      const d = c.created_at ? startOfDay(new Date(c.created_at)) : null
      return d ? d >= monthStart && d < nextMonthStart : false
    }).length

    return {
      r7,
      caMonth,
      followCount,
      clientsTotal: clients.length,
      newClientsMonth,
    }
  }, [reservations, clients, facturesPaidMonth, facturesFollow, last7Start, today, monthStart, nextMonthStart])

  const chartReservations7 = useMemo(() => {
    // map last 7 days labels
    const days: { d: string; date: string; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(last7Start)
      d.setDate(d.getDate() + i)
      const key = isoDate(d)
      days.push({
        d: d.toLocaleDateString(undefined, { weekday: 'short' }),
        date: key,
        count: 0,
      })
    }

    const byDate = new Map<string, number>()
    for (const r of reservations) {
      if (!r.created_at) continue
      const key = isoDate(startOfDay(new Date(r.created_at)))
      if (key < isoDate(last7Start) || key > isoDate(today)) continue
      byDate.set(key, (byDate.get(key) || 0) + 1)
    }

    return days.map((x) => ({ d: x.d, v: byDate.get(x.date) || 0 }))
  }, [reservations, last7Start, today])

  const chartCA30 = useMemo(() => {
    const days: { label: string; date: string }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(last30Start)
      d.setDate(d.getDate() + i)
      days.push({
        label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        date: isoDate(d),
      })
    }

    const byDate = new Map<string, number>()
    for (const f of facturesPaid30) {
      if (!f.created_at) continue
      const key = isoDate(startOfDay(new Date(f.created_at)))
      if (key < isoDate(last30Start) || key > isoDate(today)) continue
      byDate.set(key, (byDate.get(key) || 0) + Number(f.total || 0))
    }

    return days.map((x) => ({ d: x.label, v: byDate.get(x.date) || 0 }))
  }, [facturesPaid30, last30Start, today])

  const lastReservations = useMemo(() => {
    const copy = [...reservations]
    copy.sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0))
    return copy.slice(0, 6)
  }, [reservations])

  const followTop = useMemo(() => facturesFollow.slice(0, 6), [facturesFollow])

  const loading =
    qReservations.isLoading || qClients.isLoading || qFacturesPaidMonth.isLoading || qFacturesToFollow.isLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Synthèse — {today.toLocaleDateString()}
          </div>
        </div>

        <div className="flex gap-2">
          <Link className="btn bg-gray-200 dark:bg-white/10" to="/reservations">Voir réservations</Link>
          <Link className="btn-primary" to="/reservations">Nouvelle réservation</Link>
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
                <defs>
                  <linearGradient id="ut-res" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ut-sky)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="var(--ut-sky)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="d" stroke="currentColor" opacity={0.6} />
                <YAxis stroke="currentColor" opacity={0.6} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="v" stroke="var(--ut-sky)" fill="url(#ut-res)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="font-semibold mb-2">Chiffre d’affaires (30 jours)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartCA30}>
                <defs>
                  <linearGradient id="ut-ca" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ut-orange)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--ut-orange)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="d" stroke="currentColor" opacity={0.6} hide />
                <YAxis stroke="currentColor" opacity={0.6} />
                <Tooltip formatter={(v: any) => moneyXOF(v)} />
                <Area type="monotone" dataKey="v" stroke="var(--ut-orange)" fill="url(#ut-ca)" />
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
            <Link to="/reservations" className="text-sm text-primary hover:underline">Tout voir</Link>
          </div>

          {lastReservations.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune réservation trouvée.</div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {lastReservations.map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      Réservation #{r.id}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </div>
                  </div>
                  <Badge tone={r.statut === 'confirmee' ? 'green' : r.statut === 'annulee' ? 'red' : 'amber'}>
                    {r.statut || '—'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Factures à suivre (mois)</div>
            <Link to="/factures" className="text-sm text-primary hover:underline">Tout voir</Link>
          </div>

          {followTop.length === 0 ? (
            <div className="text-sm text-gray-500">Rien à signaler 🎉</div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {followTop.map((f) => (
                <div key={f.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      Facture {f.numero ?? `#${f.id}`}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Total: {moneyXOF(f.total)} • {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <Badge tone={toneFacture(f.statut)}>{f.statut || '—'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
