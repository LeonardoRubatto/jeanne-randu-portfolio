'use client';

// Motion references: scroll/horizontal-clip-path-scroll,
// scroll/parallax-image-layers, scroll/scrolltrigger-image-zoom.

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CanvasMosaic } from './canvas-mosaic';
import { ProximityTitle } from './proximity-title';

const indexProjects = [
  {
    number: '01',
    title: 'Habiter le paysage',
    meta: 'Cabane bois · Architecture intérieure',
    image: '/assets/projects/cabane/cabane-hero.webp',
  },
  {
    number: '02',
    title: 'Activer la ville',
    meta: 'Nike · Scénographie événementielle',
    image: '/assets/projects/nike/nike-storefront.webp',
  },
  {
    number: '03',
    title: 'Prolonger l’existant',
    meta: 'Véranda · Aménagement',
    image: '/assets/projects/veranda/veranda-interior.webp',
  },
  {
    number: '04',
    title: 'Creuser l’atmosphère',
    meta: 'Cave · Dégustation & exposition',
    image: '/assets/projects/cave/cave-lounge.webp',
  },
];

const archiveItems = [
  {
    title: 'Stand Louboutin',
    type: 'Retail · Scénographie',
    image: '/assets/projects/archive/louboutin.webp',
  },
  {
    title: 'Résidence cinéma',
    type: 'Espace intergénérationnel',
    image: '/assets/projects/archive/residence.webp',
  },
  {
    title: 'Chaise disco',
    type: 'Objet · Matière',
    image: '/assets/projects/archive/chair.webp',
  },
  {
    title: 'Équilibres',
    type: 'Recherches volumétriques',
    image: '/assets/projects/archive/equilibre.webp',
  },
  {
    title: 'Vitrine florale',
    type: 'Identité · Merchandising',
    image: '/assets/projects/archive/vitrine.webp',
  },
];

function PhotoStack() {
  const cards = [
    ['/assets/projects/veranda/veranda-mood-exterior.webp', 'Palette extérieure et jardin'],
    ['/assets/projects/veranda/veranda-exterior.webp', 'Perspective extérieure dessinée à la main'],
    ['/assets/projects/veranda/veranda-interior.webp', 'Perspective intérieure de la véranda'],
    ['/assets/projects/veranda/veranda-plan.webp', 'Plan et élévations'],
  ];

  return (
    <div className="photo-stack" aria-label="Étapes du projet Véranda">
      {cards.map(([src, alt], index) => (
        <figure key={src} className={`photo-card photo-card--${index + 1}`}>
          <Image src={src} alt={alt} width={1600} height={1000} sizes="(width < 900px) 76vw, 46vw" />
        </figure>
      ))}
    </div>
  );
}

export function PortfolioClient() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return () => media.revert();

    media.add('(min-width: 900px)', () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          '.prologue-image-primary img',
          { scale: 1.04 },
          {
            scale: 1.18,
            yPercent: 4,
            ease: 'none',
            scrollTrigger: {
              trigger: '.prologue',
              start: 'top top',
              end: 'bottom top',
              scrub: 0.8,
            },
          },
        );

        gsap.fromTo(
          '.prologue-image-layer',
          { yPercent: 0 },
          {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: '.prologue',
              start: 'top top',
              end: 'bottom top',
              scrub: 0.8,
            },
          },
        );

        const panels = gsap.utils.toArray<HTMLElement>('.project-panel');
        gsap.set(panels.slice(1), { clipPath: 'inset(0 100% 0 0)' });
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: '.projects-pin',
            start: 'top top',
            end: () => `+=${(panels.length - 1) * window.innerHeight}`,
            pin: true,
            scrub: 0.9,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        panels.slice(1).forEach((panel) => {
          timeline.to(panel, {
            clipPath: 'inset(0 0% 0 0)',
            duration: 0.8,
            ease: 'none',
          });
        });
      }, rootRef);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  return (
    <div ref={rootRef} className="portfolio-shell">
      <header className="topbar">
        <a href="#top" className="topbar-name" aria-label="Retour en haut">
          Jeanne Randu
        </a>
        <nav aria-label="Navigation principale">
          <a href="#index">Index</a>
          <a href="#projets">Projets</a>
          <a href="#a-propos">À propos</a>
        </nav>
        <span className="topbar-place">Tours · FR</span>
      </header>

      <main>
        <section className="prologue" id="top">
          <div className="prologue-rule prologue-rule--one" aria-hidden="true" />
          <div className="prologue-rule prologue-rule--two" aria-hidden="true" />
          <p className="prologue-kicker">Portfolio · 2026</p>
          <p className="prologue-discipline">
            Design d’espace
            <br />
            Scénographie
            <br />
            Architecture intérieure
          </p>
          <div className="prologue-image-primary">
            <Image src="/assets/projects/cabane/cabane-hero.webp" alt="Cabane en bois éclairée au cœur d’une forêt" width={1920} height={1280} sizes="(width < 900px) 88vw, 70vw" priority />
          </div>
          <div className="prologue-image-layer" aria-hidden="true">
            <Image src="/assets/projects/cabane/cabane-hero.webp" alt="" width={1920} height={1280} sizes="(width < 900px) 88vw, 70vw" />
          </div>
          <p className="prologue-axis prologue-axis--matter">MATIÈRE</p>
          <p className="prologue-axis prologue-axis--light">lumière</p>
          <p className="prologue-axis prologue-axis--use">usage</p>
          <div className="prologue-manifesto">
            <span>01 / intention</span>
            <p>
              Concevoir des espaces qui ont du sens, où l’esthétique rencontre
              l’usage et où chaque détail participe à l’expérience.
            </p>
          </div>
          <div className="scroll-note" aria-hidden="true">
            <span>faire défiler</span>
            <i />
          </div>
        </section>

        <section className="project-index" id="index">
          <header className="section-heading">
            <p>Projets choisis</p>
            <span>Quatre manières de penser l’espace</span>
          </header>
          <div className="index-intro">
            <span className="index-count">04</span>
            <p>
              Une sélection resserrée, organisée par intention plutôt que par
              chronologie.
            </p>
          </div>
          <ol className="index-list">
            {indexProjects.map((project) => (
              <li key={project.number}>
                <a href="#projets">
                  <span className="index-number">{project.number}</span>
                  <span className="index-title">{project.title}</span>
                  <span className="index-meta">{project.meta}</span>
                  <figure className="index-preview" aria-hidden="true">
                    <Image src={project.image} alt="" width={800} height={640} sizes="28vw" />
                  </figure>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="projects-pin" id="projets" aria-label="Projets principaux">
          <article className="project-panel project-panel--cabane">
            <div className="cabane-backdrop">
              <Image src="/assets/projects/cabane/cabane-hero.webp" alt="Cabane en bois immergée dans le paysage forestier" width={1920} height={1280} sizes="100vw" />
            </div>
            <Image className="cabane-object" src="/assets/projects/cabane/cabane-exterior.webp" alt="Modélisation extérieure de la cabane" width={1200} height={900} sizes="(width < 900px) 76vw, 40vw" />
            <div className="panel-copy panel-copy--light">
              <span className="panel-number">01</span>
              <p className="panel-type">Habiter le paysage · Architecture intérieure</p>
              <h2>Cabane<br /><em>bois</em></h2>
              <p className="panel-description">
                L’intention était de concevoir un espace qui ne cherche pas à
                s’imposer dans son environnement, mais à en prolonger
                l’atmosphère. Une manière d’habiter le paysage : ralentir,
                observer et laisser la nature participer à l’espace.
              </p>
            </div>
            <div className="panel-foot panel-foot--light">
              <span>Matière brute</span><span>Immersion</span><span>Double hauteur</span>
            </div>
          </article>

          <article className="project-panel project-panel--nike">
            <div className="nike-grid" aria-hidden="true" />
            <div className="nike-canvas-wrap">
              <CanvasMosaic
                src="/assets/projects/nike/nike-storefront.webp"
                alt="Activation sportive Nike implantée au centre-ville de Tours"
                className="nike-canvas"
              />
            </div>
            <Image className="nike-poster" src="/assets/projects/nike/nike-poster.webp" alt="Affiche Run Your Line de l’activation Nike" width={800} height={1200} sizes="(width < 900px) 32vw, 19vw" />
            <div className="nike-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <div className="panel-copy panel-copy--nike">
              <span className="panel-number">02</span>
              <p className="panel-type">Activer la ville · Scénographie événementielle</p>
              <h2>Run your<br /><em>line</em></h2>
              <p className="panel-description">
                Une salle de sport éphémère en plein air, pensée pour rendre le
                sport accessible et engager la communauté. Inspirées du swoosh,
                les lignes colorées incarnent trajectoire, énergie et diversité
                des parcours.
              </p>
            </div>
            <div className="panel-foot panel-foot--light">
              <span>Activation Nike</span><span>Tours</span><span>Identité & espace</span>
            </div>
          </article>

          <article className="project-panel project-panel--veranda">
            <div className="veranda-notation" aria-hidden="true">03 / CONTINUITÉ</div>
            <PhotoStack />
            <div className="panel-copy panel-copy--veranda">
              <span className="panel-number">03</span>
              <p className="panel-type">Prolonger l’existant · Aménagement</p>
              <h2>La<br /><em>véranda</em></h2>
              <p className="panel-description">
                Un travail sur la relation entre usages, volumes, matières et
                environnement, avec la volonté de créer un espace fonctionnel,
                esthétique et agréable à vivre. La conception s’appuie sur une
                continuité visuelle et matérielle.
              </p>
            </div>
            <div className="panel-foot">
              <span>Dessin à la main</span><span>Plan & élévations</span><span>Matières naturelles</span>
            </div>
          </article>

          <article className="project-panel project-panel--cave">
            <div className="cave-gallery">
              <figure className="cave-image cave-image--main">
                <Image src="/assets/projects/cave/cave-lounge.webp" alt="Espace détente de la cave, pierre et mobilier brun" width={1600} height={1000} sizes="70vw" />
              </figure>
              <figure className="cave-image cave-image--detail">
                <Image src="/assets/projects/cave/cave-tasting.webp" alt="Comptoir de dégustation devant un mur en pierre" width={1400} height={900} sizes="44vw" />
              </figure>
              <figure className="cave-image cave-image--plan">
                <Image src="/assets/projects/cave/cave-plan.webp" alt="Vue de dessus de l’aménagement de la cave" width={1200} height={1200} sizes="32vw" />
              </figure>
            </div>
            <div className="panel-copy panel-copy--cave panel-copy--light">
              <span className="panel-number">04</span>
              <p className="panel-type">Creuser l’atmosphère · Dégustation & exposition</p>
              <h2>La<br /><em>cave</em></h2>
              <p className="panel-description">
                Pierre, bois et lumière maîtrisée donnent au lieu une identité
                sobre et intemporelle. L’architecture accompagne la découverte
                du vin sans prendre le dessus sur l’expérience.
              </p>
            </div>
            <div className="panel-foot panel-foot--light">
              <span>Pierre</span><span>Scénographie du vin</span><span>Lumière contenue</span>
            </div>
          </article>
        </section>

        <section className="archive" aria-labelledby="archive-title">
          <header className="section-heading section-heading--archive">
            <p id="archive-title">Études & fragments</p>
            <span>Objets, scénographies et recherches</span>
          </header>
          <div className="archive-intro">
            <p>Ce qui compte aussi : chercher, tester, matérialiser.</p>
            <span>05 études sélectionnées</span>
          </div>
          <div className="archive-track">
            {archiveItems.map((item, index) => (
              <article className="archive-card" key={item.title}>
                <figure>
                  <Image src={item.image} alt={item.title} width={1000} height={1200} sizes="(width < 900px) 280px, 28vw" />
                </figure>
                <div>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.type}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about" id="a-propos">
          <header className="section-heading section-heading--about">
            <p>À propos</p>
            <span>Regard, méthode, intention</span>
          </header>
          <div className="about-title" aria-hidden="true">
            <ProximityTitle text="SENSIBLE" className="about-title-proximity" />
            <span className="about-title-serif">&amp; rigoureuse</span>
          </div>
          <div className="about-grid">
            <p className="about-lead">
              Actuellement en deuxième année de DN MADE Événement à
              Sainte-Marguerite, à Chambray-lès-Tours, je développe une approche
              sensible et créative du design d’espace, de la scénographie et de
              l’architecture intérieure.
            </p>
            <div className="about-copy">
              <p>
                Passionnée par la conception d’espaces, je m’intéresse
                particulièrement à la relation entre volumes, matières, lumière
                et usages. J’apprécie la recherche autour des ambiances et la
                manière dont un espace peut transmettre une identité, susciter
                une émotion et proposer une véritable expérience.
              </p>
              <p>
                Ma formation me permet de développer ma créativité tout en
                acquérant une méthodologie de projet, de la réflexion initiale
                jusqu’à la conception. Curieuse, rigoureuse et attentive aux
                détails, je souhaite continuer à enrichir mon regard et mes
                compétences afin de concevoir des projets cohérents, sensibles
                et fonctionnels.
              </p>
            </div>
          </div>
          <blockquote>
            « Concevoir des espaces qui ont du sens, où l’esthétique rencontre
            l’usage. »
          </blockquote>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-name" href="#top">Jeanne Randu</a>
        <p>Design d’espace · Scénographie · Architecture intérieure</p>
        <div className="footer-bottom">
          <span>© 2026 Jeanne Randu</span>
          <Link href="/mentions-legales">Mentions légales</Link>
          <a href="https://telaventis.fr" target="_blank" rel="noopener">Site by Telaventis</a>
        </div>
      </footer>
    </div>
  );
}
