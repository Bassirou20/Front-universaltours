
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import LoginPage from './features/auth/LoginPage'
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="produits" element={<ProduitsPage />} />
        <Route path="forfaits" element={<ForfaitsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="depenses" element={<DepensesPage />} />
        <Route path="factures" element={<FacturesPage />} />
        <Route path="paiements" element={<PaiementsPage />} />
        <Route path="fournisseurs" element={<FournisseursPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
