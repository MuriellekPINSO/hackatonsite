"use client";

import Image from "next/image";
import { LiquidBlobHover } from "@/components/ui/liquid-blob-hover";

export type Sponsor = {
  name: string;
  /** Chemin dans /public. Absent → on retombe sur le wordmark texte. */
  logo?: string;
  /** Ligne secondaire sous le wordmark (type de partenariat). */
  note?: string;
  href?: string;
};

type SponsorMarqueeProps = {
  label?: string;
  sponsors: Sponsor[];
  /** Durée d'un tour complet. Plus haut = plus lent. */
  durationSeconds?: number;
  /** "left" (défaut) ou "right" : utile pour faire défiler deux rangées en sens inverse. */
  direction?: "left" | "right";
};

/**
 * Bandeau de sponsors en défilement infini.
 *
 * Deux animations indépendantes se superposent, comme dans la référence :
 *   1. la piste entière glisse horizontalement en boucle (`marqueeDrift`) ;
 *   2. chaque carte fait respirer ses quatre rayons de bordure séparément
 *      (`sponsorMorph`), avec un `animation-delay` négatif dérivé de l'index
 *      pour que deux cartes voisines ne soient jamais dans la même phase.
 *
 * La liste est rendue deux fois : la piste fait donc 200 % de large et
 * translater de -50 % ramène pile sur la copie, d'où la boucle sans couture.
 * Le second exemplaire est `aria-hidden` : purement décoratif, il ne doit pas
 * doubler les sponsors pour un lecteur d'écran.
 */
export function SponsorMarquee({
  label,
  sponsors,
  durationSeconds = 42,
  direction = "left",
}: SponsorMarqueeProps) {
  if (sponsors.length === 0) return null;

  const renderCard = (sponsor: Sponsor, index: number, cloned: boolean) => {
    const inner = (
      <>
        {/* Goutte liquide qui suit le curseur, comme sur le CTA du hero.
            Rendue avant le contenu : le calque est en position:absolute, il
            passe donc DERRIÈRE le wordmark/logo qui suit dans le flux. */}
        <LiquidBlobHover />
        {sponsor.logo ? (
          <Image
            className="sponsor-logo"
            src={sponsor.logo}
            alt={sponsor.name}
            width={220}
            height={64}
          />
        ) : (
          <span className="sponsor-wordmark">{sponsor.name}</span>
        )}
        {sponsor.note && <span className="sponsor-note">{sponsor.note}</span>}
      </>
    );

    return (
      <li
        className="sponsor-card"
        key={`${cloned ? "clone" : "item"}-${sponsor.name}`}
        // Décale la phase du morph. Le modulo évite qu'une longue liste
        // finisse avec des délais si grands que les cartes de fin partent
        // toutes ensemble.
        style={{ animationDelay: `-${(index % 7) * 1.7}s` }}
      >
        {sponsor.href ? (
          <a
            className="sponsor-card-link"
            href={sponsor.href}
            target="_blank"
            rel="noreferrer noopener"
            tabIndex={cloned ? -1 : undefined}
          >
            {inner}
          </a>
        ) : (
          inner
        )}
      </li>
    );
  };

  const list = (cloned: boolean) => (
    <ul className="sponsor-list" aria-hidden={cloned || undefined}>
      {sponsors.map((s, i) => renderCard(s, i, cloned))}
    </ul>
  );

  return (
    <div className="sponsor-marquee">
      {label && <p className="sponsor-marquee-label">{label}</p>}
      <div className="sponsor-marquee-viewport">
        <div
          className="sponsor-track"
          style={{
            animationDuration: `${durationSeconds}s`,
            animationDirection: direction === "right" ? "reverse" : "normal",
          }}
        >
          {list(false)}
          {/* Copie décorative : c'est elle qui rend la boucle invisible. */}
          {list(true)}
        </div>
      </div>
    </div>
  );
}

export default SponsorMarquee;
