// src/features/legal/PrivacyPage.tsx
import { LegalLayout, LegalSection } from './LegalLayout'
import { AGENCY } from '../../lib/agencyConfig'

/**
 * Politique de Confidentialité — Itinéo SaaS.
 *
 * ⚠️ Modèle de base à faire relire par un juriste (loi Sénégal n°2008-12 sur les
 * données personnelles / RGPD si clients UE) avant exploitation commerciale.
 */
export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de Confidentialité" updatedAt="29 mai 2026">
      <p>
        La présente politique décrit comment <strong>Itinéo</strong> (« nous ») collecte,
        utilise et protège les données personnelles dans le cadre de la plateforme de gestion
        destinée aux agences de voyage (« le Service »). Nous accordons une importance particulière
        à la protection de la vie privée et à la sécurité des données.
      </p>

      <LegalSection n={1} title="Responsable du traitement">
        <p>
          Itinéo est responsable du traitement des données relatives aux comptes des
          agences clientes et de leurs utilisateurs. Pour les données saisies par une agence sur ses
          propres clients, l'agence agit en tant que responsable de traitement et Itinéo en
          tant que sous-traitant technique.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Données collectées">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Données de compte :</strong> nom, prénom, email, téléphone, rôle, mot de passe (chiffré).</li>
          <li><strong>Données de l'agence :</strong> raison sociale, coordonnées, logo, paramètres.</li>
          <li><strong>Données métier :</strong> clients, réservations, factures, paiements, dépenses saisis par l'agence.</li>
          <li><strong>Données techniques :</strong> adresse IP, type de navigateur et appareil, horodatage des connexions (journaux de sécurité).</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Finalités du traitement">
        <p>Les données sont traitées pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>fournir et faire fonctionner le Service ;</li>
          <li>authentifier les utilisateurs et sécuriser les accès ;</li>
          <li>assurer le support et la facturation ;</li>
          <li>améliorer le Service et prévenir les abus.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Isolation et confidentialité des données">
        <p>
          Le Service est <strong>multi-tenant</strong> : les données de chaque agence sont
          strictement isolées et cloisonnées. Une agence ne peut en aucun cas accéder aux données
          d'une autre agence. Les accès internes sont limités au personnel habilité et tracés.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles adaptées :
          chiffrement des mots de passe, transmission sécurisée (HTTPS), contrôle des accès par
          rôle, journalisation des actions sensibles et gestion des sessions actives. Aucune
          méthode n'étant infaillible, nous ne pouvons garantir une sécurité absolue, mais nous nous
          engageons à réagir rapidement à tout incident.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Conservation des données">
        <p>
          Les données sont conservées pendant la durée d'utilisation du Service. Après résiliation,
          elles peuvent être conservées pendant une durée limitée (à des fins légales, comptables ou
          de récupération) puis supprimées de manière sécurisée.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Partage avec des tiers">
        <p>
          Nous ne vendons ni ne louons vos données. Elles peuvent être traitées par des
          prestataires techniques strictement nécessaires au fonctionnement du Service (hébergement,
          envoi d'emails transactionnels), tenus à la confidentialité et agissant sur nos
          instructions.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Vos droits">
        <p>
          Conformément à la réglementation applicable en matière de protection des données
          personnelles, vous disposez de droits d'accès, de rectification, d'effacement et
          d'opposition. Vous pouvez les exercer en nous contactant à l'adresse ci-dessous. Les
          fonctions d'export du Service vous permettent par ailleurs de récupérer vos données à tout
          moment.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cookies">
        <p>
          Le Service utilise uniquement les cookies et le stockage local strictement nécessaires à
          son fonctionnement (maintien de la session de connexion). Aucun cookie publicitaire ou de
          traçage tiers n'est utilisé.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Contact">
        <p>
          Pour toute question relative à la protection de vos données ou pour exercer vos droits,
          contactez-nous à l'adresse{' '}
          <a href={`mailto:${AGENCY.email}`} className="text-[#052468] underline">{AGENCY.email}</a>.
        </p>
      </LegalSection>

      <p className="text-xs text-[#9e9d99] italic pt-4 border-t border-black/[0.08]">
        Ce document constitue un modèle. Avant toute exploitation commerciale, il est recommandé de
        le faire valider par un conseil juridique (loi sénégalaise n°2008-12 sur la protection des
        données à caractère personnel et/ou RGPD selon votre clientèle).
      </p>
    </LegalLayout>
  )
}
