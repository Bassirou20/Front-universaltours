// src/features/superadmin/SuperAdminAgenciesPage.tsx
import { money } from '../../lib/helpers'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Search, Plus, LogIn, Ban, CheckCircle2, Trash2,
  TrendingUp, Users, CalendarCheck, Wallet, Sparkles,
  Loader2, ShieldAlert, CreditCard, X, KeyRound, RotateCcw, Archive,
  Eye, Download,
} from 'lucide-react'
import { api, setImpersonatedAgency, getImpersonatedAgency } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { CreateAgencyModal } from './CreateAgencyModal'
import { AgencyDetailDrawer } from './AgencyDetailDrawer'

type AgencyStats = {
  users_count: number
  clients_count: number
  reservations_count: number
  factures_count: number
  revenue: number
  last_user_login: string | null
}

type Agency = {
  id: number
  name: string
  slug: string
  ref_prefix: string
  email_contact: string | null
  phone: string | null
  logo_url: string | null
  plan: string
  status: string
  primary_color: string
  trial_ends_at: string | null
  subscribed_at: string | null
  next_billing_at: string | null
  created_at: string
  deleted_at: string | null
  stats: AgencyStats
  owner: { id: number; nom: string; prenom: string; email: string } | null
}

type PlatformStats = {
  agencies: {
    total: number
    active: number
    trial: number
    suspended: number
    new_this_month: number
  }
  platform: {
    total_users: number
    total_clients: number
    total_reservations: number
    total_factures: number
  }
  revenue: {
    total: number
    monthly: number
    currency: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  trial:     'bg-blue-50 text-blue-700 ring-blue-200',
  active:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  past_due:  'bg-amber-50 text-amber-700 ring-amber-200',
  suspended: 'bg-red-50 text-red-700 ring-red-200',
  canceled:  'bg-gray-100 text-gray-700 ring-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  trial:     'Essai',
  active:    'Actif',
  past_due:  'En retard',
  suspended: 'Suspendu',
  canceled:  'Résilié',
}

function fromNow(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  return d.toLocaleDateString('fr-FR')
}

export default function SuperAdminAgenciesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

  // ── Si on était en impersonate, on quitte avant d'afficher cette page ────
  useEffect(() => {
    if (getImpersonatedAgency()) {
      setImpersonatedAgency(null)
      qc.clear()
    }
  }, [qc])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [extendFor, setExtendFor] = useState<Agency | null>(null)
  const [showTrashed, setShowTrashed] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  // Confirmation avant une action sensible (remplace window.confirm)
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    confirmLabel: string
    run: () => void
  } | null>(null)

  const statsQuery = useQuery<PlatformStats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: async () => (await api.get('/super-admin/stats')).data,
  })

  const agenciesQuery = useQuery<{ data: Agency[] }>({
    queryKey: ['super-admin', 'agencies', search, statusFilter, showTrashed],
    queryFn: async () => {
      const params: any = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (showTrashed) params.trashed = 'only'
      return (await api.get('/super-admin/agencies', { params })).data
    },
  })

  const suspendMut = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/super-admin/agencies/${id}/suspend`)).data,
    onSuccess: (d) => {
      toast.push({ tone: 'success', title: d.message })
      qc.invalidateQueries({ queryKey: ['super-admin'] })
    },
    onError: () => toast.push({ tone: 'error', title: 'Erreur lors de la modification' }),
  })

  const extendMut = useMutation({
    mutationFn: async (vars: { id: number; plan: string; months: number }) =>
      (await api.post(`/super-admin/agencies/${vars.id}/extend`, { plan: vars.plan, months: vars.months })).data,
    onSuccess: (d) => {
      toast.push({ tone: 'success', title: d.message || 'Abonnement prolongé.' })
      qc.invalidateQueries({ queryKey: ['super-admin'] })
      setExtendFor(null)
    },
    onError: () => toast.push({ tone: 'error', title: "Erreur lors de l'extension" }),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/super-admin/agencies/${id}`)).data,
    onSuccess: (d) => {
      toast.push({ tone: 'success', title: d.message || 'Agence supprimée.' })
      qc.invalidateQueries({ queryKey: ['super-admin'] })
    },
    onError: () => toast.push({ tone: 'error', title: 'Erreur lors de la suppression' }),
  })

  const restoreMut = useMutation({
    mutationFn: async (id: number) => (await api.post(`/super-admin/agencies/${id}/restore`)).data,
    onSuccess: (d) => {
      toast.push({ tone: 'success', title: d.message || 'Agence restaurée.' })
      qc.invalidateQueries({ queryKey: ['super-admin'] })
    },
    onError: () => toast.push({ tone: 'error', title: 'Erreur lors de la restauration' }),
  })

  const resetPwdMut = useMutation({
    mutationFn: async (id: number) =>
      (await api.post(`/super-admin/agencies/${id}/reset-owner-password`)).data,
    onSuccess: (d) => {
      // Le mot de passe temporaire n'est renvoyé qu'une fois : on l'affiche.
      window.prompt(
        `Mot de passe temporaire pour ${d.owner_email}.\n` +
        `Transmettez-le au propriétaire (il devra le changer à la connexion).\n\n` +
        `Copiez ce mot de passe :`,
        d.temp_password,
      )
      toast.push({ tone: 'success', title: d.message || 'Mot de passe réinitialisé.' })
    },
    onError: (e: any) =>
      toast.push({ tone: 'error', title: e?.response?.data?.message || 'Erreur lors de la réinitialisation' }),
  })

  const confirmResetPwd = (a: Agency) => {
    if (!a.owner) {
      toast.push({ tone: 'error', title: "Cette agence n'a pas de propriétaire défini." })
      return
    }
    setPendingConfirm({
      title: 'Réinitialiser le mot de passe ?',
      message: `${a.owner.prenom} ${a.owner.nom} (${a.owner.email})`,
      confirmLabel: 'Réinitialiser',
      run: () => resetPwdMut.mutate(a.id),
    })
  }

  // Suppression sécurisée : on demande de retaper le nom exact de l'agence
  const confirmDelete = (a: Agency) => {
    const input = window.prompt(
      `⚠️ Suppression de l'agence "${a.name}".\n\n` +
      `Cette action désactive l'agence et tous ses accès (récupérable 30 jours).\n\n` +
      `Pour confirmer, retapez le nom exact de l'agence :`,
    )
    if (input === null) return // annulé
    if (input.trim() !== a.name.trim()) {
      toast.push({ tone: 'error', title: 'Le nom ne correspond pas. Suppression annulée.' })
      return
    }
    deleteMut.mutate(a.id)
  }

  // ── Entrer dans une agence (mode impersonate) ────────────────────────────
  const enterAgency = (agency: Agency) => {
    setImpersonatedAgency(agency.id)
    qc.clear()
    toast.push({ tone: 'info', title: `Mode "${agency.name}" activé` })
    navigate('/dashboard')
  }

  // ── Export CSV (respecte les filtres courants) ───────────────────────────
  const exportCsv = async () => {
    setExporting(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (showTrashed) params.trashed = 'only'
      const res = await api.get('/super-admin/agencies/export', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `agences_itineo_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.push({ tone: 'error', title: "Échec de l'export CSV" })
    } finally {
      setExporting(false)
    }
  }

  const stats = statsQuery.data
  const agencies = agenciesQuery.data?.data ?? []

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <ShieldAlert size={22} className="text-red-600" />
            Super-Admin · Plateforme
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue cross-agences. Surveille, gère et soutiens toutes les agences clientes.
          </p>
        </div>
      </div>

      {/* ─── KPI globaux ─── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<Building2 size={16} />}
            label="Agences"
            value={stats.agencies.total}
            sub={`${stats.agencies.active} actives · ${stats.agencies.trial} essai`}
            tone="indigo"
          />
          <KpiCard
            icon={<TrendingUp size={16} />}
            label="CA total"
            value={money(stats.revenue.total)}
            sub={`${money(stats.revenue.monthly)} ce mois`}
            tone="emerald"
          />
          <KpiCard
            icon={<Users size={16} />}
            label="Utilisateurs"
            value={stats.platform.total_users}
            sub={`${stats.platform.total_clients} clients gérés`}
            tone="sky"
          />
          <KpiCard
            icon={<CalendarCheck size={16} />}
            label="Réservations"
            value={stats.platform.total_reservations}
            sub={`${stats.platform.total_factures} factures`}
            tone="amber"
          />
        </div>
      )}

      {/* ─── Toolbar (recherche + filtres) ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une agence (nom, slug, préfixe, email)…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="trial">Essai</option>
          <option value="active">Actif</option>
          <option value="past_due">En retard</option>
          <option value="suspended">Suspendu</option>
          <option value="canceled">Résilié</option>
        </select>

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="Exporter la liste filtrée en CSV"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export CSV
        </button>

        <button
          type="button"
          onClick={() => setShowTrashed(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            showTrashed
              ? 'bg-gray-800 text-white border-gray-800'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          title="Afficher les agences supprimées"
        >
          <Archive size={14} />
          {showTrashed ? 'Corbeille active' : 'Corbeille'}
        </button>

        {!showTrashed && (
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold hover:from-red-700 hover:to-rose-700 transition-all"
          >
            <Plus size={14} />
            Nouvelle agence
          </button>
        )}
      </div>

      {/* ─── Liste des agences ─── */}
      {agenciesQuery.isLoading ? (
        <div className="py-12 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : agencies.length === 0 ? (
        <div className="py-12 text-center text-gray-400">Aucune agence trouvée.</div>
      ) : (
        <div className="space-y-3">
          {agencies.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              {/* Logo */}
              <div className="w-14 h-14 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
                {a.logo_url ? (
                  <img src={a.logo_url} alt={a.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-base font-bold text-gray-400">{a.ref_prefix}</div>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{a.name}</h3>
                  <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${STATUS_COLORS[a.status] || STATUS_COLORS.canceled}`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                  <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                    {a.plan}
                  </span>
                  <span className="text-[12px] font-mono text-gray-400">{a.ref_prefix}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span>{a.email_contact || '—'}</span>
                  {a.owner && <span>Owner : {a.owner.prenom} {a.owner.nom}</span>}
                  <span>Dernière connexion : {fromNow(a.stats.last_user_login)}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <Mini icon={<Users size={11} />} label="Users" value={a.stats.users_count} />
                  <Mini icon={<Users size={11} />} label="Clients" value={a.stats.clients_count} />
                  <Mini icon={<CalendarCheck size={11} />} label="Résas" value={a.stats.reservations_count} />
                  <Mini icon={<Wallet size={11} />} label="CA" value={money(a.stats.revenue)} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => setDetailId(a.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
                  title={`Voir le détail de ${a.name}`}
                >
                  <Eye size={12} />
                  Détails
                </button>
                {a.deleted_at ? (
                  // ── Agence supprimée : seule la restauration est proposée ──
                  <button
                    type="button"
                    onClick={() =>
                      setPendingConfirm({
                        title: `Restaurer l'agence « ${a.name} » ?`,
                        message: "L'agence et ses accès seront réactivés.",
                        confirmLabel: 'Restaurer',
                        run: () => restoreMut.mutate(a.id),
                      })
                    }
                    disabled={restoreMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    title={`Restaurer ${a.name}`}
                  >
                    <RotateCcw size={12} />
                    Restaurer
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => enterAgency(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#052468] text-white text-xs font-semibold hover:bg-[#073195]"
                      title={`Entrer dans ${a.name}`}
                    >
                      <LogIn size={12} />
                      Entrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtendFor(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                      title={`Marquer payé / prolonger ${a.name}`}
                    >
                      <CreditCard size={12} />
                      Marquer payé
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmResetPwd(a)}
                      disabled={resetPwdMut.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                      title={`Réinitialiser le mot de passe du propriétaire`}
                    >
                      <KeyRound size={12} />
                      Mot de passe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const verb = a.status === 'suspended' ? 'Réactiver' : 'Suspendre'
                        setPendingConfirm({
                          title: `${verb} l'agence « ${a.name} » ?`,
                          message: a.status === 'suspended'
                            ? "Les utilisateurs de l'agence retrouveront l'accès."
                            : "Les utilisateurs de l'agence perdront l'accès tant qu'elle est suspendue.",
                          confirmLabel: verb,
                          run: () => suspendMut.mutate(a.id),
                        })
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                        a.status === 'suspended'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                      title={a.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                    >
                      {a.status === 'suspended' ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                      {a.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(a)}
                      disabled={deleteMut.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                      title={`Supprimer ${a.name}`}
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-gray-400 flex items-center gap-1 justify-center pt-4">
        <Sparkles size={11} />
        {agencies.length} agence{agencies.length > 1 ? 's' : ''} affichée{agencies.length > 1 ? 's' : ''}
      </div>

      {/* Drawer de détail agence */}
      <AgencyDetailDrawer agencyId={detailId} onClose={() => setDetailId(null)} />

      {/* Confirmation des actions sensibles */}
      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title}
        message={pendingConfirm?.message}
        confirmLabel={pendingConfirm?.confirmLabel}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.run()
          setPendingConfirm(null)
        }}
      />

      {/* Modal création d'agence */}
      <CreateAgencyModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />

      {/* Modal extension / marquer payé */}
      {extendFor && (
        <ExtendModal
          agency={extendFor}
          onClose={() => setExtendFor(null)}
          onConfirm={(plan, months) => extendMut.mutate({ id: extendFor.id, plan, months })}
          loading={extendMut.isPending}
        />
      )}
    </div>
  )
}

// ── Modal d'extension manuelle d'abonnement ──────────────────────────────────
function ExtendModal({
  agency, onClose, onConfirm, loading,
}: {
  agency: Agency
  onClose: () => void
  onConfirm: (plan: string, months: number) => void
  loading: boolean
}) {
  const [plan, setPlan] = useState(agency.plan === 'trial' ? 'starter' : agency.plan)
  const [months, setMonths] = useState(1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#0d1321] rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" />
            Marquer comme payé
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Confirme un paiement reçu hors-ligne pour <strong>{agency.name}</strong> : active l'agence
          et prolonge l'échéance. Échéance actuelle :{' '}
          <strong>{agency.next_billing_at ? new Date(agency.next_billing_at).toLocaleDateString('fr-FR') : '—'}</strong>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Formule</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
            >
              <option value="starter">Starter</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Durée (mois)</label>
            <input
              type="number"
              min={1}
              max={36}
              value={months}
              onChange={(e) => setMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(plan, months)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirmer le paiement
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composants internes ─────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, tone }: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub: string
  tone: 'indigo' | 'emerald' | 'sky' | 'amber'
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-3">
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold ${tones[tone]}`}>
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-2 truncate">{value}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  )
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{value}</span>
    </div>
  )
}
