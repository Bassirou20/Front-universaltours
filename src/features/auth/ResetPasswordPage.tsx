import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import logo from '../../assets/brand/logounivtours.webp'

const schema = z.object({
  password: z.string().min(6, 'Minimum 6 caractères'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
})
type FormVals = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate        = useNavigate()
  const [showPwd, setShowPwd]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone]             = useState(false)
  const [serverError, setServerError] = useState('')

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (vals: FormVals) => {
    setServerError('')
    if (!token || !email) {
      setServerError('Lien invalide ou expiré. Refaites une demande de réinitialisation.')
      return
    }
    try {
      await api.post('/password/reset', {
        email,
        token,
        password: vals.password,
        password_confirmation: vals.password_confirmation,
      })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (e: any) {
      setServerError(e?.response?.data?.message || 'Lien invalide ou expiré.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ut-bg)] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Universal Tours" className="h-12 object-contain" />
        </div>

        <div className="card p-8">
          {!done ? (
            <>
              <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nouveau mot de passe
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choisissez un mot de passe sécurisé d'au moins 6 caractères.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {/* Nouveau mot de passe */}
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input !pl-9 pr-10"
                      placeholder="••••••••"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPwd(v => !v)}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirmation */}
                <div>
                  <label className="label">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="input !pl-9 pr-10"
                      placeholder="••••••••"
                      {...register('password_confirmation')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirm(v => !v)}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password_confirmation && (
                    <p className="mt-1 text-xs text-red-500">{errors.password_confirmation.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">
                    {serverError}
                    {' '}
                    <Link to="/forgot-password" className="underline font-medium">
                      Refaire une demande
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full justify-center"
                  disabled={isSubmitting || !token || !email}
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Réinitialisation…</>
                  ) : (
                    'Réinitialiser le mot de passe'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Succès */
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mot de passe modifié !
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Vous allez être redirigé vers la page de connexion dans 3 secondes…
                </p>
              </div>
              <Link to="/login" className="btn-primary inline-flex">
                Se connecter maintenant
              </Link>
            </div>
          )}

          {!done && (
            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
