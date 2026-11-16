// src/features/auth/VerifyEmailPage.tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useAuth } from '../../store/auth'
import logo from '../../assets/brand/itineo-mark.svg'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const { token: authToken } = useAuth()
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  // Garde anti double-appel : le token de vérification est à usage unique.
  // En dev (React.StrictMode) les effets se montent 2×, ce qui consommerait
  // le token au 1er appel et ferait échouer le 2nd. On ne le vérifie qu'une fois.
  const verifiedOnce = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Lien de vérification invalide.')
      return
    }
    if (verifiedOnce.current) return
    verifiedOnce.current = true
    api.get(`/verify-email/${token}`)
      .then((r) => {
        setStatus('success')
        setMessage(r.data.message || 'Votre email a été vérifié avec succès !')
      })
      .catch((e) => {
        setStatus('error')
        setMessage(e?.response?.data?.message || 'Le lien de vérification est invalide ou a expiré.')
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.08] p-8 max-w-md w-full text-center">
        <img src={logo} alt="Itinéo" className="h-10 w-auto mx-auto mb-6" />

        {status === 'verifying' && (
          <>
            <Loader2 size={48} className="text-gray-400 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900 mb-1">Vérification en cours…</h1>
            <p className="text-sm text-gray-500">Merci de patienter quelques secondes.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Email vérifié !</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            {authToken ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#052468] hover:bg-[#073195] text-white text-sm font-semibold transition-colors"
              >
                Accéder à mon dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#052468] hover:bg-[#073195] text-white text-sm font-semibold transition-colors"
              >
                Me connecter
              </Link>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-rose-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Vérification échouée</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <div className="space-y-2">
              <Link
                to="/login"
                className="block w-full py-2.5 rounded-lg bg-[#052468] hover:bg-[#073195] text-white text-sm font-semibold transition-colors text-center"
              >
                Se connecter
              </Link>
              <Link
                to="/signup"
                className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                Créer un nouveau compte
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
