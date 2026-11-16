// src/features/legal/TermsPage.tsx
import { LegalLayout, LegalSection } from './LegalLayout'
import { AGENCY } from '../../lib/agencyConfig'

/**
 * Conditions Générales d'Utilisation (CGU) — Itinéo SaaS.
 *
 * ⚠️ Modèle de base à faire relire par un juriste avant exploitation commerciale.
 * Adapté à un logiciel SaaS de gestion pour agences de voyage (droit OHADA / Sénégal).
 */
export default function TermsPage() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" updatedAt="29 mai 2026">
      <p>
        Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et
        l'utilisation de la plateforme <strong>Itinéo</strong> (« le Service »), un
        logiciel en ligne (SaaS) de gestion destiné aux agences de voyage. En créant un compte ou
        en utilisant le Service, vous (« l'Agence cliente », « vous ») acceptez sans réserve les
        présentes CGU.
      </p>

      <LegalSection n={1} title="Objet">
        <p>
          Le Service permet aux agences de voyage de gérer leurs clients, réservations, forfaits,
          factures, paiements, dépenses et utilisateurs au sein d'un espace de travail isolé et
          sécurisé. L'éditeur du Service est <strong>Itinéo</strong>, joignable à
          l'adresse {AGENCY.email}.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Création de compte et essai gratuit">
        <p>
          L'inscription est ouverte aux professionnels du voyage. Vous garantissez que les
          informations fournies sont exactes et à jour. Vous êtes responsable de la confidentialité
          de vos identifiants et de toute activité réalisée sous votre compte.
        </p>
        <p>
          Le Service propose une <strong>période d'essai gratuite de 14 jours</strong>, sans carte
          bancaire et sans engagement. À l'issue de l'essai, l'accès en écriture est suspendu tant
          qu'une formule payante n'a pas été souscrite ; vos données restent toutefois consultables.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Abonnement et facturation">
        <p>
          L'accès continu au Service nécessite la souscription d'une formule payante. Les tarifs en
          vigueur sont communiqués lors de la souscription. Sauf mention contraire, les abonnements
          sont sans engagement de durée et résiliables à tout moment, l'arrêt prenant effet à la fin
          de la période en cours.
        </p>
        <p>
          Tout retard de paiement peut entraîner la suspension de l'accès en écriture, puis la
          résiliation du compte après un délai raisonnable de régularisation.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Propriété des données">
        <p>
          Vous restez seul propriétaire des données que vous saisissez dans le Service (données
          clients, réservations, documents, etc.). Itinéo s'interdit d'exploiter ces
          données à d'autres fins que la fourniture du Service. Vous pouvez exporter vos données à
          tout moment via les fonctions d'export disponibles.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Obligations de l'Agence cliente">
        <p>Vous vous engagez à :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>utiliser le Service conformément aux lois et règlements en vigueur ;</li>
          <li>ne pas tenter d'accéder aux données d'autres agences ni de compromettre la sécurité du Service ;</li>
          <li>obtenir le consentement de vos propres clients pour le traitement de leurs données personnelles ;</li>
          <li>ne pas utiliser le Service à des fins frauduleuses ou illicites.</li>
        </ul>
      </LegalSection>

      <LegalSection n={6} title="Disponibilité et maintenance">
        <p>
          Itinéo met en œuvre les moyens raisonnables pour assurer une disponibilité
          continue du Service, sans toutefois garantir une absence totale d'interruption. Des
          opérations de maintenance peuvent être réalisées, autant que possible en dehors des heures
          ouvrées et avec information préalable.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Responsabilité">
        <p>
          Le Service est fourni « en l'état ». Itinéo ne saurait être tenu responsable des
          dommages indirects (perte de chiffre d'affaires, de clientèle, de données résultant d'un
          usage non conforme, etc.). Il vous appartient de réaliser vos propres sauvegardes via les
          exports mis à disposition.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Résiliation">
        <p>
          Vous pouvez résilier votre compte à tout moment. Itinéo peut suspendre ou
          résilier un compte en cas de manquement grave aux présentes CGU. Après résiliation, vos
          données peuvent être conservées pendant une durée limitée puis supprimées de manière
          sécurisée.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Modification des CGU">
        <p>
          Itinéo peut faire évoluer les présentes CGU. Vous serez informé de toute
          modification substantielle. La poursuite de l'utilisation du Service vaut acceptation des
          CGU mises à jour.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Droit applicable">
        <p>
          Les présentes CGU sont régies par le droit en vigueur au lieu d'établissement de
          l'éditeur. Tout litige fera l'objet d'une recherche de solution amiable avant toute action
          judiciaire.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Contact">
        <p>
          Pour toute question relative aux présentes CGU, contactez-nous à l'adresse{' '}
          <a href={`mailto:${AGENCY.email}`} className="text-[#052468] underline">{AGENCY.email}</a>.
        </p>
      </LegalSection>

      <p className="text-xs text-[#9e9d99] italic pt-4 border-t border-black/[0.08]">
        Ce document constitue un modèle. Avant toute exploitation commerciale, il est recommandé de
        le faire valider par un conseil juridique au regard de votre situation et de la
        réglementation applicable.
      </p>
    </LegalLayout>
  )
}
