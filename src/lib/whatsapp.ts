// src/lib/whatsapp.ts
// Helper pour envoyer des messages WhatsApp via le lien officiel wa.me
// (Pas besoin de WhatsApp Business API — gratuit et fonctionne pour V1)

import { AGENCY } from './agencyConfig'

/**
 * Normalise un numéro de téléphone au format international SANS le +
 * Ex: "+221 77 123 45 67" → "221771234567"
 *     "77 123 45 67"      → "221771234567" (préfixe Sénégal ajouté)
 */
export function normalizePhone(phone: string, defaultCountry = '221'): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return ''

  // Si commence par +, retire le + et garde la suite
  if (cleaned.startsWith('+')) return cleaned.slice(1)

  // Si commence par 00, retire les 00
  if (cleaned.startsWith('00')) return cleaned.slice(2)

  // Si commence par 221 (Sénégal), garde tel quel
  if (cleaned.startsWith(defaultCountry)) return cleaned

  // Si numéro local (commence par 7, 6, 3 au Sénégal), ajoute préfixe
  if (/^[0-9]{9,10}$/.test(cleaned)) return defaultCountry + cleaned.replace(/^0/, '')

  return cleaned
}

/**
 * Ouvre WhatsApp Web/App avec un message pré-rempli.
 * URL officielle wa.me — fonctionne sans intégration API.
 */
export function openWhatsApp(phone: string, message: string): boolean {
  const normalized = normalizePhone(phone)
  if (!normalized) {
    console.warn('openWhatsApp: numéro invalide', phone)
    return false
  }
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

// ─── Templates ───────────────────────────────────────────────────────────────

const money = (n: number, currency = 'XOF') =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} ${currency}`

const greet = (firstName?: string | null) =>
  firstName ? `Bonjour ${firstName}` : 'Bonjour'

export type WhatsAppContext = {
  client?: { prenom?: string | null; nom?: string | null; telephone?: string | null }
  reservation?: {
    reference?: string | null
    type?: string | null
    montant_total?: number | null
    devise?: string | null
    statut?: string | null
  }
  facture?: {
    numero?: string | null
    reference?: string | null
    montant_total?: number | null
    devise?: string | null
    remaining?: number | null
    date_echeance?: string | null
  }
  agencyName?: string
}

export const templates = {
  /** Confirmation de réservation après création */
  reservationConfirmed: (ctx: WhatsAppContext): string => {
    const ag = ctx.agencyName || AGENCY.name
    const ref = ctx.reservation?.reference || '—'
    const total = Number(ctx.reservation?.montant_total || 0)
    const cur = ctx.reservation?.devise || 'XOF'
    return [
      `${greet(ctx.client?.prenom)} 👋`,
      ``,
      `Votre réservation est confirmée chez ${ag}.`,
      ``,
      `📋 *Référence* : ${ref}`,
      total > 0 ? `💰 *Montant total* : ${money(total, cur)}` : null,
      ``,
      `Pour toute question, contactez-nous au ${AGENCY.phone}.`,
      ``,
      `Merci de votre confiance,`,
      `L'équipe ${ag}`,
    ].filter(Boolean).join('\n')
  },

  /** Rappel facture impayée */
  invoiceReminder: (ctx: WhatsAppContext): string => {
    const ag = ctx.agencyName || AGENCY.name
    const num = ctx.facture?.numero || ctx.facture?.reference || '—'
    const total = Number(ctx.facture?.montant_total || 0)
    const remaining = Number(ctx.facture?.remaining ?? total)
    const cur = ctx.facture?.devise || 'XOF'
    const echeance = ctx.facture?.date_echeance
      ? new Date(ctx.facture.date_echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      : null
    return [
      `${greet(ctx.client?.prenom)} 👋`,
      ``,
      `Nous vous rappelons que votre facture *${num}* est en attente de règlement.`,
      ``,
      `💰 *Montant restant* : ${money(remaining, cur)}`,
      echeance ? `📅 *Échéance* : ${echeance}` : null,
      ``,
      `Vous pouvez régler par Wave, Orange Money, virement ou espèces.`,
      `Pour toute question, contactez-nous au ${AGENCY.phone}.`,
      ``,
      `Cordialement,`,
      `L'équipe ${ag}`,
    ].filter(Boolean).join('\n')
  },

  /** Confirmation de paiement reçu */
  paymentReceived: (ctx: WhatsAppContext & { montantRecu?: number }): string => {
    const ag = ctx.agencyName || 'Universal Tours'
    const ref = ctx.reservation?.reference || ctx.facture?.numero || '—'
    const recu = Number((ctx as any).montantRecu || 0)
    const cur = ctx.reservation?.devise || ctx.facture?.devise || 'XOF'
    const remaining = Number(ctx.facture?.remaining ?? 0)
    return [
      `${greet(ctx.client?.prenom)} ✅`,
      ``,
      `Nous accusons réception de votre paiement de *${money(recu, cur)}*.`,
      ``,
      `📋 *Référence* : ${ref}`,
      remaining > 0
        ? `⚠️ *Reste à payer* : ${money(remaining, cur)}`
        : `✅ *Solde* : entièrement réglé. Merci !`,
      ``,
      `Cordialement,`,
      `L'équipe ${ag}`,
    ].filter(Boolean).join('\n')
  },

  /** Envoi de devis (réservation en brouillon/en_attente) */
  devis: (ctx: WhatsAppContext): string => {
    const ag = ctx.agencyName || AGENCY.name
    const ref = ctx.reservation?.reference || '—'
    const total = Number(ctx.reservation?.montant_total || 0)
    const cur = ctx.reservation?.devise || 'XOF'
    return [
      `${greet(ctx.client?.prenom)} 👋`,
      ``,
      `Voici notre proposition pour votre voyage :`,
      ``,
      `📋 *Référence devis* : ${ref}`,
      total > 0 ? `💰 *Montant total* : ${money(total, cur)}` : null,
      ``,
      `Si cette offre vous convient, répondez "OK" sur ce numéro et nous lancerons la procédure de confirmation et de paiement.`,
      ``,
      `Contactez-nous au ${AGENCY.phone} pour toute question.`,
      ``,
      `Restant à votre disposition,`,
      `L'équipe ${ag}`,
    ].filter(Boolean).join('\n')
  },
}
