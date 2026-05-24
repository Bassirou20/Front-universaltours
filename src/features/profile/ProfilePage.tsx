// src/features/profile/ProfilePage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../store/auth'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import {
  User as UserIcon, Mail, ShieldCheck, LogOut, KeyRound,
  Eye, EyeOff, Loader2, CheckCircle2, Calendar, Save,
  AlertCircle, Phone,
} from 'lucide-react'
import SessionsList from './SessionsList'

export default function ProfilePage() {
  const { user, logout, refreshMe } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // ── Identity ──
  const fullName  = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim() || user?.email || 'Compte'
  const roleRaw   = String(user?.role || '').toLowerCase()
  const isAdmin   = roleRaw === 'admin'
  const roleLabel = isAdmin ? 'Administrateur' : roleRaw === 'employee' ? 'Employé' : (user?.role || '—')

  const a = (user?.prenom ?? '').trim()[0] ?? ''
  const b = (user?.nom ?? '').trim()[0] ?? ''
  const ini = (a + b).toUpperCase() || (user?.email ?? 'UT').slice(0, 2).toUpperCase()

  // ── Profile form ──
  const [profile, setProfile] = useState({
    prenom: user?.prenom ?? '',
    nom: user?.nom ?? '',
    email: user?.email ?? '',
  })

  useEffect(() => {
    setProfile({
      prenom: user?.prenom ?? '',
      nom: user?.nom ?? '',
      email: user?.email ?? '',
    })
  }, [user?.id])

  const profileDirty =
    profile.prenom !== (user?.prenom ?? '') ||
    profile.nom    !== (user?.nom ?? '') ||
    profile.email  !== (user?.email ?? '')

  const mUpdateProfile = useMutation({
    mutationFn: async () => {
      await api.put('/profile', {
        prenom: profile.prenom.trim() || null,
        nom: profile.nom.trim() || null,
        email: profile.email.trim(),
      })
    },
    onSuccess: async () => {
      toast.push({ title: 'Profil mis à jour ✓', tone: 'success' })
      await refreshMe()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
                || (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat()[0] : null)
                || 'Erreur lors de la mise à jour.'
      toast.push({ title: String(msg), tone: 'error' })
    },
  })

  // ── Password form ──
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })

  const mChangePwd = useMutation({
    mutationFn: async () => {
      if (pwd.next.length < 8) throw new Error('Le nouveau mot de passe doit faire au moins 8 caractères.')
      if (pwd.next !== pwd.confirm) throw new Error('La confirmation ne correspond pas.')
      await api.post('/password/change', {
        current_password: pwd.current,
        password: pwd.next,
        password_confirmation: pwd.confirm,
      })
    },
    onSuccess: () => {
      toast.push({ title: 'Mot de passe mis à jour ✓', tone: 'success' })
      setPwd({ current: '', next: '', confirm: '' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // ── Password strength ──
  const pwdStrength = (p: string) => {
    if (!p) return { score: 0, label: '', color: '' }
    let s = 0
    if (p.length >= 8) s++
    if (p.length >= 12) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Très fort']
    const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-500', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600']
    return { score: s, label: labels[s], color: colors[s] }
  }
  const strength = pwdStrength(pwd.next)

  const mustChangePwd = Boolean((user as any)?.must_change_password)

  return (
    <div className="space-y-4">

      {/* ── Bandeau d'alerte si mot de passe à changer ── */}
      {mustChangePwd && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Changement de mot de passe requis
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Votre administrateur vous a fourni un mot de passe temporaire. Pour des raisons de sécurité, veuillez le remplacer immédiatement par un mot de passe personnel ci-dessous.
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <UserIcon size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Mon profil</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              Informations du compte, identité et sécurité
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors shrink-0"
        >
          <LogOut size={14} /> Déconnexion
        </button>
      </div>

      {/* ── Hero identity card (full width) ── */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden relative">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-transparent to-orange-50/30 dark:from-sky-500/[0.04] dark:to-orange-500/[0.04] pointer-events-none" />
        <div className="h-1 bg-gradient-to-r from-[var(--ut-navy)] via-[var(--ut-sky)] to-[var(--ut-orange)]" />

        <div className="relative p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--ut-navy)] to-[var(--ut-sky)] text-white text-2xl font-bold shadow-xl shadow-sky-500/20">
              {ini}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{fullName}</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isAdmin
                    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25'
                }`}>
                  <ShieldCheck size={10} /> {roleLabel}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  user?.actif
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user?.actif ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {user?.actif ? 'Compte actif' : 'Compte inactif'}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {user?.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 min-w-0">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <UserIcon size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs">ID utilisateur #{user?.id ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 columns: Personal info + Password ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Personal info ── */}
        <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center gap-2">
            <UserIcon size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informations personnelles</h3>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); mUpdateProfile.mutate() }}
            className="p-5 space-y-3 flex-1 flex flex-col"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input
                  className="input"
                  placeholder="Ex: Bachir"
                  value={profile.prenom}
                  onChange={(e) => setProfile((s) => ({ ...s, prenom: e.target.value }))}
                  autoComplete="given-name"
                />
              </div>

              <div>
                <label className="label">Nom</label>
                <input
                  className="input"
                  placeholder="Ex: Diallo"
                  value={profile.nom}
                  onChange={(e) => setProfile((s) => ({ ...s, nom: e.target.value }))}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                Email <span className="text-red-500">*</span>
                <Mail size={11} className="text-gray-400 ml-auto" />
              </label>
              <input
                type="email"
                className="input"
                placeholder="vous@example.com"
                value={profile.email}
                onChange={(e) => setProfile((s) => ({ ...s, email: e.target.value }))}
                autoComplete="email"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">
                L'adresse email est utilisée pour la connexion et les notifications.
              </p>
            </div>

            <div className="flex-1" />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] -mx-5 px-5 -mb-5 pb-4">
              {profileDirty && (
                <span className="mr-auto text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle size={12} /> Modifications non enregistrées
                </span>
              )}
              <button
                type="button"
                onClick={() => setProfile({
                  prenom: user?.prenom ?? '',
                  nom: user?.nom ?? '',
                  email: user?.email ?? '',
                })}
                disabled={!profileDirty || mUpdateProfile.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!profileDirty || mUpdateProfile.isPending || !profile.email.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ut-navy)] hover:brightness-110 text-white px-3 py-1.5 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mUpdateProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>

        {/* ── Change password ── */}
        <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center gap-2">
            <KeyRound size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sécurité — Mot de passe</h3>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); mChangePwd.mutate() }}
            className="p-5 space-y-3 flex-1 flex flex-col"
          >
            <div>
              <label className="label">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="input pr-9"
                  placeholder="••••••••"
                  value={pwd.current}
                  onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="input pr-9"
                  placeholder="Au moins 8 caractères"
                  value={pwd.next}
                  onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))}
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {/* Strength meter */}
              {pwd.next && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold shrink-0 ${
                    strength.score <= 1 ? 'text-red-500' :
                    strength.score <= 2 ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirmation</label>
              <input
                type={showNew ? 'text' : 'password'}
                className="input"
                placeholder="Re-saisir le nouveau"
                value={pwd.confirm}
                onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))}
                autoComplete="new-password"
                minLength={8}
              />
              {pwd.next && pwd.confirm && pwd.next !== pwd.confirm && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> Les mots de passe ne correspondent pas.
                </p>
              )}
              {pwd.next && pwd.confirm && pwd.next === pwd.confirm && (
                <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Les mots de passe correspondent.
                </p>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] -mx-5 px-5 -mb-5 pb-4">
              <button
                type="button"
                onClick={() => setPwd({ current: '', next: '', confirm: '' })}
                disabled={mChangePwd.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                Effacer
              </button>
              <button
                type="submit"
                disabled={
                  mChangePwd.isPending
                  || !pwd.current
                  || !pwd.next
                  || !pwd.confirm
                  || pwd.next !== pwd.confirm
                  || pwd.next.length < 8
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ut-navy)] hover:brightness-110 text-white px-3 py-1.5 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mChangePwd.isPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Sessions actives (Phase 3) ── */}
      <SessionsList />

      {/* ── Tips / Security info ── */}
      <div className="rounded-xl border border-sky-200 dark:border-sky-500/25 bg-sky-50/60 dark:bg-sky-500/[0.06] p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <ShieldCheck size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-sky-900 dark:text-sky-200">Bonnes pratiques de sécurité</div>
          <ul className="mt-1 text-xs text-sky-800/80 dark:text-sky-300/70 space-y-0.5 list-disc list-inside marker:text-sky-400">
            <li>Utilisez un mot de passe d'au moins 12 caractères avec lettres, chiffres et symboles.</li>
            <li>Ne réutilisez jamais le même mot de passe sur plusieurs sites.</li>
            <li>Changer de mot de passe déconnectera toutes vos autres sessions actives.</li>
            <li>Vérifiez régulièrement vos sessions actives et révoquez les appareils inconnus.</li>
          </ul>
        </div>
      </div>

    </div>
  )
}
