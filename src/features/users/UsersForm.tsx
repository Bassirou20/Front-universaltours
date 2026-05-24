import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2, Eye, EyeOff, User as UserIcon, Mail, Lock, Shield,
  CheckCircle2, AlertCircle, RefreshCw, Save,
} from 'lucide-react'

const schema = z.object({
  prenom: z.string().optional().nullable(),
  nom: z.string().min(1, 'Nom requis').max(150),
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'employee'], { required_error: 'Rôle requis' }),
  password: z.string().optional(),
})

export type UserInput = z.infer<typeof schema>

// ─── Évaluation de la force du mot de passe ─────────────────────────────────
type PwStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string; bgClass: string }

function evaluatePassword(pw: string): PwStrength {
  if (!pw) return { score: 0, label: '—', color: 'text-gray-400', bgClass: 'bg-gray-200 dark:bg-white/10' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, PwStrength> = {
    0: { score: 0, label: 'Trop court',  color: 'text-rose-600 dark:text-rose-400',     bgClass: 'bg-rose-500' },
    1: { score: 1, label: 'Faible',      color: 'text-rose-600 dark:text-rose-400',     bgClass: 'bg-rose-500' },
    2: { score: 2, label: 'Moyen',       color: 'text-amber-600 dark:text-amber-400',   bgClass: 'bg-amber-500' },
    3: { score: 3, label: 'Fort',        color: 'text-sky-600 dark:text-sky-400',       bgClass: 'bg-sky-500' },
    4: { score: 4, label: 'Très fort',   color: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500' },
  }
  return map[Math.min(score, 4) as 0 | 1 | 2 | 3 | 4]
}

// ─── Champ avec icône + label compact ───────────────────────────────────────
function Field({
  label, icon, required, error, hint, children,
}: {
  label: string
  icon?: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            {icon}
          </span>
        )}
        {children}
      </div>
      {hint && !error && <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">{hint}</div>}
      {error && (
        <div className="text-[10.5px] text-rose-600 dark:text-rose-400 mt-1 inline-flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full pl-9 pr-3 py-2 border border-black/15 dark:border-white/15 rounded-lg bg-white dark:bg-white/[0.03] text-[13px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none transition focus:border-[var(--ut-orange)] focus:ring-[3px] focus:ring-[var(--ut-orange)]/15'

// ─── Génération mdp temporaire côté frontend (pour création) ────────────────
function generateTempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const symbols = '!@#$%'
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  let part1 = ''
  for (let i = 0; i < 3; i++) part1 += pick(letters)
  let part2 = ''
  for (let i = 0; i < 4; i++) part2 += pick(digits)
  return part1 + part2 + pick(symbols)
}

export default function UsersForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
  isEdit = false,
}: {
  defaultValues?: Partial<UserInput>
  onSubmit: (vals: UserInput) => void
  onCancel: () => void
  submitting?: boolean
  isEdit?: boolean
}) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<UserInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'employee',
      ...defaultValues,
    },
  })

  const [showPwd, setShowPwd] = useState(false)
  const passwordVal = watch('password') || ''
  const roleVal = watch('role')
  const strength = useMemo(() => evaluatePassword(passwordVal), [passwordVal])

  const isEditMode = isEdit || Boolean(defaultValues?.email)

  const handleGenerate = () => {
    const pwd = generateTempPassword()
    setValue('password', pwd, { shouldValidate: true, shouldDirty: true })
    setShowPwd(true)
    navigator.clipboard?.writeText(pwd).catch(() => {})
  }

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-4">

      {/* Identité */}
      <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <UserIcon size={12} />
          Identité
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Prénom" icon={<UserIcon size={14} />} error={errors.prenom?.message?.toString()}>
            <input className={inputCls} {...register('prenom')} placeholder="Amadou" />
          </Field>
          <Field label="Nom" icon={<UserIcon size={14} />} required error={errors.nom?.message?.toString()}>
            <input className={inputCls} {...register('nom')} placeholder="Diallo" />
          </Field>
        </div>
        <Field label="Email" icon={<Mail size={14} />} required error={errors.email?.message?.toString()}>
          <input className={inputCls} type="email" {...register('email')} placeholder="prenom@universal-tours.com" />
        </Field>
      </div>

      {/* Rôle */}
      <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <Shield size={12} />
          Rôle & permissions
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            {
              value: 'employee',
              label: 'Agent',
              hint: 'Gère ses propres réservations',
              tone: 'sky',
            },
            {
              value: 'admin',
              label: 'Administrateur',
              hint: 'Accès total + gestion utilisateurs',
              tone: 'purple',
            },
          ] as const).map((opt) => {
            const active = roleVal === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('role', opt.value, { shouldValidate: true, shouldDirty: true })}
                className={[
                  'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all duration-150',
                  active
                    ? 'border-[var(--ut-orange)] bg-[var(--ut-orange)]/5'
                    : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-black/15 dark:hover:border-white/15',
                ].join(' ')}
              >
                <div className={[
                  'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                  active
                    ? 'bg-[var(--ut-orange)] text-white'
                    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400',
                ].join(' ')}>
                  <Shield size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={[
                    'text-[13px] font-semibold leading-tight',
                    active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
                  ].join(' ')}>
                    {opt.label}
                  </div>
                  <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {opt.hint}
                  </div>
                </div>
                {active && <CheckCircle2 size={14} className="shrink-0 text-[var(--ut-orange)]" />}
              </button>
            )
          })}
        </div>
        {errors.role && (
          <div className="text-[10.5px] text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.role.message?.toString()}
          </div>
        )}
      </div>

      {/* Mot de passe */}
      <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Lock size={12} />
            Mot de passe {isEditMode && <span className="text-[10px] normal-case font-normal text-gray-400">(facultatif en édition)</span>}
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--ut-orange)] hover:underline"
            title="Génère un mot de passe sécurisé et le copie dans le presse-papier"
          >
            <RefreshCw size={11} />
            Générer
          </button>
        </div>

        <Field
          label={isEditMode ? 'Nouveau mot de passe' : 'Mot de passe'}
          icon={<Lock size={14} />}
          required={!isEditMode}
          error={errors.password?.message?.toString()}
          hint={isEditMode ? 'Laissez vide pour ne pas changer' : 'Au moins 8 caractères recommandés'}
        >
          <input
            className={inputCls + ' pr-10'}
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
            tabIndex={-1}
            aria-label={showPwd ? 'Masquer' : 'Afficher'}
          >
            {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </Field>

        {/* Indicateur de force */}
        {passwordVal.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-gray-500 dark:text-gray-400">Force du mot de passe</span>
              <span className={'font-semibold ' + strength.color}>{strength.label}</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={[
                    'flex-1 h-1 rounded-full transition-all',
                    i < strength.score ? strength.bgClass : 'bg-gray-200 dark:bg-white/[0.06]',
                  ].join(' ')}
                />
              ))}
            </div>
            <PasswordChecklist pw={passwordVal} />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-100 transition disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--ut-orange)] hover:brightness-95 transition disabled:opacity-50 shadow-sm"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isEditMode ? 'Mettre à jour' : 'Créer l\'utilisateur'}
        </button>
      </div>
    </form>
  )
}

// ─── Checklist visuelle des règles du mot de passe ─────────────────────────
function PasswordChecklist({ pw }: { pw: string }) {
  const rules = [
    { ok: pw.length >= 8,                              label: '8+ caractères' },
    { ok: /[A-Z]/.test(pw) && /[a-z]/.test(pw),        label: 'Majuscule + minuscule' },
    { ok: /\d/.test(pw),                                label: 'Au moins 1 chiffre' },
    { ok: /[^A-Za-z0-9]/.test(pw),                      label: 'Au moins 1 symbole' },
  ]
  return (
    <div className="grid grid-cols-2 gap-1 mt-1.5">
      {rules.map((r, i) => (
        <div key={i} className="inline-flex items-center gap-1.5 text-[10px]">
          {r.ok ? (
            <CheckCircle2 size={10} className="text-emerald-500" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full border border-gray-300 dark:border-white/15" />
          )}
          <span className={r.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
            {r.label}
          </span>
        </div>
      ))}
    </div>
  )
}
