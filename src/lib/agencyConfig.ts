// src/lib/agencyConfig.ts
// ── Identité de la plateforme Itinéo (éditeur du SaaS) ──────────────────────
// Coordonnées affichées sur la landing, les pages légales et l'abonnement.

export const AGENCY = {
  name: 'Itinéo',
  tagline: 'La plateforme de gestion des agences de voyage',
  email: 'contact@itineo.com',
  phone: '+221 77 579 96 01',
  whatsapp: '+221775799601', // format E.164 sans espaces (pour wa.me)
  address: 'Dakar, Sénégal',
  website: 'https://itineo.com',
  // Numéros administratifs (à compléter au besoin)
  ninea: '',
  rccm: '',
} as const

/** URL "wa.me" prête à l'emploi pour contacter l'agence avec un message optionnel. */
export function agencyWhatsAppUrl(message?: string): string {
  const phone = AGENCY.whatsapp.replace(/[^\d]/g, '')
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
