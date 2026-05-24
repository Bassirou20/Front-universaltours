
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './store/auth'
import { ToastProvider } from './ui/Toasts'

// ──────────────────────────────────────────────────────────────────────────────
// Redirection au chargement de l'app : toute URL "interne" (non publique)
// est remplacée par la landing page AVANT que React monte.
// → Pas de flash de la page protégée avant redirection.
// → Les pages publiques (login, forgot, reset) restent intactes (utile si
//   l'utilisateur est en train de remplir le formulaire de connexion / reset).
// ──────────────────────────────────────────────────────────────────────────────
const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password']
const currentPath = window.location.pathname
if (!PUBLIC_PATHS.includes(currentPath)) {
  window.history.replaceState(null, '', '/')
}

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
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
