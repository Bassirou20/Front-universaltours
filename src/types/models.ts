// Shared model interfaces — generated from Laravel API responses

export interface Client {
  id: number
  nom: string
  prenom?: string | null
  email?: string | null
  telephone?: string | null
  adresse?: string | null
  nationalite?: string | null
  passeport?: string | null
  date_naissance?: string | null
  created_at?: string
  updated_at?: string
}

export interface Produit {
  id: number
  type: 'billet_avion' | 'hotel' | 'voiture' | 'evenement'
  nom: string
  description?: string | null
  prix_base: number
  actif: boolean | number
  created_at?: string
  updated_at?: string
}

export interface Forfait {
  id: number
  nom: string
  type: 'solo' | 'couple' | 'famille'
  event_id?: number | null
  nombre_max_personnes?: number | null
  description?: string | null
  prix?: number | null
  prix_adulte?: number | null
  prix_enfant?: number | null
  actif: boolean | number
  created_at?: string
  updated_at?: string
}

export interface Participant {
  id: number
  reservation_id: number
  prenom: string
  nom: string
  email?: string | null
  telephone?: string | null
  date_naissance?: string | null
  passeport?: string | null
  role?: string | null
}

export interface Paiement {
  id: number
  facture_id: number
  montant: number
  mode: string
  statut: 'recu' | 'en_attente' | 'annule'
  reference?: string | null
  notes?: string | null
  date_paiement?: string | null
  created_at?: string
  updated_at?: string
}

export interface Facture {
  id: number
  reservation_id: number
  numero?: string | null
  date_facture?: string | null
  montant_sous_total?: number | null
  montant_taxes?: number | null
  montant_total?: number | null
  statut: 'brouillon' | 'emis' | 'paye_partiellement' | 'paye_totalement' | 'annule' | 'impayee' | 'payee' | 'partielle'
  pdf_path?: string | null
  paiements?: Paiement[]
  created_at?: string
  updated_at?: string
}

export interface Reservation {
  id: number
  client_id?: number | null
  produit_id?: number | null
  forfait_id?: number | null
  reference?: string | null
  type?: string | null
  statut: 'brouillon' | 'confirmee' | 'annulee' | 'en_attente'
  date_depart?: string | null
  date_retour?: string | null
  nombre_personnes?: number | null
  montant_total?: number | null
  notes?: string | null
  client?: Client
  produit?: Produit
  forfait?: Forfait
  participants?: Participant[]
  facture?: Facture
  created_at?: string
  updated_at?: string
}

export interface Fournisseur {
  id: number
  nom: string
  email?: string | null
  telephone?: string | null
  site_web?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface Depense {
  id: number
  categorie?: string | null
  montant: number
  description?: string | null
  date_depense?: string | null
  fournisseur_id?: number | null
  fournisseur?: Fournisseur
  created_at?: string
  updated_at?: string
}

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'employee'
  created_at?: string
  updated_at?: string
}

// ─── Laravel paginated response wrapper ──────────────────────────────────────

export interface LaravelPage<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page?: number
  total?: number
  from?: number
  to?: number
}
