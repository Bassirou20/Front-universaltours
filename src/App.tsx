import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'

// ── Lazy-loaded pages (chacune devient un chunk séparé) ──
const HomePage               = lazy(() => import('./features/home/HomePage'))
const LoginPage              = lazy(() => import('./features/auth/LoginPage'))
const ForgotPasswordPage     = lazy(() => import('./features/auth/ForgotPasswordPage'))
const ResetPasswordPage      = lazy(() => import('./features/auth/ResetPasswordPage'))
const Dashboard              = lazy(() => import('./features/dashboard/Dashboard'))
const ClientsPage            = lazy(() => import('./features/clients/ClientsPage'))
const ProduitsPage           = lazy(() => import('./features/produits/ProduitsPage'))
const ReservationsPage       = lazy(() => import('./features/reservations/ReservationsPage'))
const ReservationDetailsPage = lazy(() => import('./features/reservations/ReservationDetailsPage'))
const FacturesPage           = lazy(() => import('./features/factures/FacturesPage'))
const ForfaitsPage           = lazy(() => import('./features/forfaits/ForfaitsPage'))
const PaiementsPage          = lazy(() => import('./features/paiements/PaiementsPage'))
const FournisseursPage       = lazy(() => import('./features/fournisseurs/FournisseursPage'))
const UsersPage              = lazy(() => import('./features/users/UsersPage'))
const DepensesPage           = lazy(() => import('./features/depenses/DepensesPage'))
const AvoirsPage             = lazy(() => import('./features/avoirs/AvoirsPage'))
const ActivitesPage          = lazy(() => import('./features/activites/ActivitesPage'))
const ProfilePage            = lazy(() => import('./features/profile/ProfilePage'))
const NotificationsPage      = lazy(() => import('./features/notifications/NotificationsPage'))

// ── Fallback léger pendant le chargement d'un chunk ──
function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-400 dark:text-gray-500 gap-2 text-sm">
      <Loader2 size={16} className="animate-spin" />
      Chargement…
    </div>
  )
}

// Helper : enveloppe ErrorBoundary + Suspense pour chaque route paresseuse
function L({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"                element={<L><HomePage /></L>} />
      <Route path="/login"           element={<L><LoginPage /></L>} />
      <Route path="/forgot-password" element={<L><ForgotPasswordPage /></L>} />
      <Route path="/reset-password"  element={<L><ResetPasswordPage /></L>} />

      {/* ── Authenticated (AppShell layout) ── */}
      <Route element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route path="/dashboard"            element={<L><Dashboard /></L>} />
        <Route path="/clients"              element={<L><ClientsPage /></L>} />
        <Route path="/produits"             element={<L><ProduitsPage /></L>} />
        <Route path="/forfaits"             element={<L><ForfaitsPage /></L>} />
        <Route path="/reservations"         element={<L><ReservationsPage /></L>} />
        <Route path="/reservations/:id"     element={<L><ReservationDetailsPage /></L>} />
        <Route path="/depenses"             element={<L><DepensesPage /></L>} />
        <Route path="/avoirs"               element={<L><AvoirsPage /></L>} />
        <Route path="/factures"             element={<L><FacturesPage /></L>} />
        <Route path="/paiements"            element={<L><PaiementsPage /></L>} />
        <Route path="/fournisseurs"         element={<L><FournisseursPage /></L>} />
        <Route path="/users"                element={<L><UsersPage /></L>} />
        <Route path="/activites"            element={<L><ActivitesPage /></L>} />
        <Route path="/profile"              element={<L><ProfilePage /></L>} />
        <Route path="/notifications"        element={<L><NotificationsPage /></L>} />
      </Route>

      {/* ── 404 → vers la home publique ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
