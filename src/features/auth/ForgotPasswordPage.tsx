import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import logo from '../../assets/brand/logounivtours.webp'

const schema = z.object({
  email: z.string().email('Email invalide'),
})
type FormVals = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (vals: FormVals) => {
    setServerError('')
    try {
      await api.post('/password/forget', { email: vals.email })
      setSubmittedEmail(vals.email)
      setSent(true)
    } catch (e: any) {
      setServerError(e?.response?.data?.message || 'Une erreur est survenue.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ut-bg)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Universal Tours" className="h-12 object-contain" />
        </div>

        <div className="card p-8">
          {!sent ? (
            <>
              <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mot de passe oublié
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Entrez votre email et nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      className="input !pl-9"
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {serverError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">
                    {serverError}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Envoi en cours…</>
                  ) : (
                    'Envoyer le lien'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Confirmation envoi */
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email envoyé !</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Si un compte existe pour{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{submittedEmail}</span>,
                  vous recevrez un lien de réinitialisation dans quelques minutes.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Vérifiez également vos spams.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
