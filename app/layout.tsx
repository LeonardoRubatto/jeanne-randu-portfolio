import type { Metadata } from 'next';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jeanne Randu — Design d’espace & scénographie',
  description:
    'Portfolio de Jeanne Randu, étudiante en DN MADE Événement : design d’espace, scénographie et architecture intérieure.',
  // TODO: replace the reserved placeholder origin when the final domain is known.
  metadataBase: new URL('https://example.com'),
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Jeanne Randu — Portfolio',
    title: 'Jeanne Randu — Design d’espace & scénographie',
    description: 'Matière, lumière, usage : une sélection de projets de design d’espace et de scénographie.',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Jeanne Randu — Habiter l’atmosphère' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jeanne Randu — Design d’espace & scénographie',
    description: 'Matière, lumière, usage : une sélection de projets de design d’espace et de scénographie.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Jeanne Randu',
              url: 'https://example.com/',
              jobTitle: 'Étudiante en DN MADE Événement',
              knowsAbout: ['Design d’espace', 'Scénographie', 'Architecture intérieure'],
              address: { '@type': 'PostalAddress', addressCountry: 'FR' },
            }),
          }}
        />
      </body>
    </html>
  );
}
