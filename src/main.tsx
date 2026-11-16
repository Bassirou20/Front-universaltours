
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './store/auth'
import { ToastProvider } from './ui/Toasts'
import { PlanErrorListener } from './ui/PlanErrorListener'

// NB : pas de réécriture d'URL avant le montage de React.
// La protection des routes est gérée par <AuthGuard> (qui lit le token de
// façon synchrone et redirige vers /login sans flash de contenu protégé).
// Réécrire l'URL ici cassait : le rechargement d'une page authentifiée
// (renvoyé à tort sur la landing), le lien de vérification d'email
// (/verify-email/:token) et les pages publiques /signup, /cgu, /confidentialite.

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: 0,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>
          <PlanErrorListener />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
