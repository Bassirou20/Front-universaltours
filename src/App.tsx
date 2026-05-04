
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './ui/ErrorBoundary'
import LoginPage from './features/auth/LoginPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import { AppShell } from './components/layout/AppShell'
import Dashboard from './features/dashboard/Dashboard'
import ClientsPage from './features/clients/ClientsPage'
import ProduitsPage from './features/produits/ProduitsPage'
import ReservationsPage from './features/reservations/ReservationsPage'
import FacturesPage from './features/factures/FacturesPage'
import ForfaitsPage from './features/forfaits/ForfaitsPage'
import PaiementsPage from './features/paiements/PaiementsPage'
import FournisseursPage from './features/fournisseurs/FournisseursPage'
import UsersPage from './features/users/UsersPage'
import DepensesPage from './features/depenses/DepensesPage'
import AvoirsPage from './features/avoirs/AvoirsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="clients" element={<ErrorBoundary><ClientsPage /></ErrorBoundary>} />
        <Route path="produits" element={<ErrorBoundary><ProduitsPage /></ErrorBoundary>} />
        <Route path="forfaits" element={<ErrorBoundary><ForfaitsPage /></ErrorBoundary>} />
        <Route path="reservations" element={<ErrorBoundary><ReservationsPage /></ErrorBoundary>} />
        <Route path="depenses" element={<ErrorBoundary><DepensesPage /></ErrorBoundary>} />
        <Route path="avoirs" element={<ErrorBoundary><AvoirsPage /></ErrorBoundary>} />
        <Route path="factures" element={<ErrorBoundary><FacturesPage /></ErrorBoundary>} />
        <Route path="paiements" element={<ErrorBoundary><PaiementsPage /></ErrorBoundary>} />
        <Route path="fournisseurs" element={<ErrorBoundary><FournisseursPage /></ErrorBoundary>} />
        <Route path="/users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
