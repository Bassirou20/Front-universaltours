// src/lib/agencyConfig.ts
// ── Coordonnées et identité de l'agence ─────────────────────────────────────
// Centralisé ici pour pouvoir migrer vers une page Settings administrable plus tard.

export const AGENCY = {
  name: 'Universal Tours',
  tagline: 'Agence de voyage',
  email: 'contact@universal-tours.com',
  phone: '+221 77 579 96 01',
  whatsapp: '+221775799601', // format E.164 sans espaces (pour wa.me)
  address: 'Dakar, Sénégal',
  website: 'https://universal-tours.com',
  // Numéros administratifs (à compléter au besoin)
  ninea: '',
  rccm: '',
} as const

/** URL "wa.me" prête à l'emploi pour contacter l'agence avec un message optionnel. */
export function agencyWhatsAppUrl(message?: string): string {
  const phone = AGENCY.whatsapp.replace(/[^\d]/g, '')
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
