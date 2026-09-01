import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions légales — Jeanne Randu',
  description: 'Mentions légales, confidentialité et crédits du portfolio de Jeanne Randu.',
  alternates: { canonical: '/mentions-legales' },
};

export default function MentionsLegales() {
  return (
    <main className="legal-page">
      <Link className="legal-back" href="/">← Retour au portfolio</Link>
      <h1>Mentions<br /><em>légales</em></h1>
      <div className="legal-warning">
        <strong>Page non prête à publier.</strong> Le statut juridique, l’adresse,
        l’adresse e-mail de contact, le directeur de publication, le domaine et
        les informations définitives d’hébergement restent à confirmer.
      </div>

      <h2>1. Éditeur du site</h2>
      <p>
        Nom : Jeanne Randu<br />
        Statut juridique : [STATUT JURIDIQUE]<br />
        Numéro d’immatriculation : [SIRET OU ÉQUIVALENT]<br />
        Adresse : [RUE], [CODE POSTAL] [VILLE], France<br />
        E-mail : [ADRESSE E-MAIL]<br />
        Directeur de la publication : [À CONFIRMER]
      </p>

      <h2>2. Hébergement</h2>
      <p>
        Hébergeur : [HÉBERGEUR À CONFIRMER]<br />
        Adresse : [ADRESSE DE L’HÉBERGEUR]<br />
        Site : https://example.com
      </p>

      <h2>3. Données personnelles</h2>
      <p>
        Ce portfolio ne comporte actuellement aucun formulaire et ne collecte
        directement aucune donnée personnelle. Si un moyen de contact ou un outil
        de mesure d’audience est ajouté, cette section devra être actualisée avant
        publication. Toute demande liée aux droits d’accès, de rectification,
        d’effacement ou d’opposition pourra être adressée à [ADRESSE E-MAIL]. Une
        réclamation peut également être introduite auprès de la CNIL.
      </p>

      <h2>4. Cookies et traceurs</h2>
      <p>
        Le site n’utilise actuellement aucun cookie publicitaire, aucun outil
        d’analyse d’audience et aucun stockage local destiné au suivi des visiteurs.
        Les polices sont auto-hébergées.
      </p>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        Les textes, projets et visuels présentés appartiennent à Jeanne Randu, sauf
        mention contraire. Toute reproduction ou diffusion sans autorisation
        préalable est interdite. Le domaine, l’hébergement et le code source du site
        seront transférés au client lors de la mise en ligne selon les conditions du
        projet.
      </p>

      <h2>6. Crédits tiers</h2>
      <ul>
        <li>Instrument Serif et Instrument Sans, distribuées sous licence SIL Open Font License.</li>
        <li>« ScrollTrigger GSAP Horizontal Clip Path » par moussamamadou, CodePen, licence non confirmée — inspiration uniquement.</li>
        <li>« Parallax Image Layers » par Osmo / osmosupply, CodePen, licence non confirmée — inspiration uniquement.</li>
        <li>« ScrollTrigger Image Zoom » par GreenSock, CodePen, licence non confirmée — inspiration uniquement.</li>
        <li>« Canvas Grid Mouse Effect » par creativeocean, CodePen, licence non confirmée — inspiration uniquement.</li>
        <li>« Images Reveal » par codse / animata, licence MIT.</li>
        <li>« Variable Font Cursor Proximity » par Daniel Petho / Fancy Components, licence MIT.</li>
      </ul>

      <h2>7. Mise à jour</h2>
      <p>Dernière mise à jour : 1 septembre 2026.</p>
    </main>
  );
}
