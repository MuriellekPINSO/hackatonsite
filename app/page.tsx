"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Cloud from "reicon-react/icons/Cloud";
import GraduationCap from "reicon-react/icons/GraduationCap";
import Bullhorn from "reicon-react/icons/Bullhorn";
import Handshake from "reicon-react/icons/Handshake";
import User from "reicon-react/icons/User";
import Users from "reicon-react/icons/Users";
import Laptop from "reicon-react/icons/Laptop";
import type { IconComponent } from "reicon-react/createIcon";
import HowItWorks from "@/components/ui/how-it-works";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import GlobeIntro from "@/components/globe-intro";

const GOLD = { bg: "bg-[#c24f2a]/10", text: "text-[#c24f2a]", border: "border-[#c24f2a]/20" };
const INK = { bg: "bg-[#303034]/[0.05]", text: "text-[#303034]", border: "border-[#303034]/15" };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Page() {
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroOutroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Hero video scroll-scrub + nav shadow + reveal-on-scroll, driven by GSAP
  // ScrollTrigger instead of hand-rolled rect/resize math.
  useEffect(() => {
    const heroScroll = heroScrollRef.current;
    const video = heroVideoRef.current;
    const heroText = heroTextRef.current;
    const heroOutro = heroOutroRef.current;
    const nav = navRef.current;
    const cleanups: Array<() => void> = [];

    // --- Hero video scroll-scrub ---
    if (heroScroll && video) {
      let ready = video.readyState >= 1; // metadata may already be loaded before this runs
      const onLoadedMetadata = () => {
        ready = true;
        ScrollTrigger.refresh();
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      // iOS/Safari sometimes needs a play/pause cycle to decode the first frame for scrubbing
      video.play().then(() => video.pause()).catch(() => {});

      const st = ScrollTrigger.create({
        trigger: heroScroll,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          if (!ready || !isFinite(video.duration)) return;
          const progress = self.progress;
          const target = progress * video.duration;
          if (Math.abs(video.currentTime - target) > 0.03) {
            video.currentTime = target;
          }

          // Intro text fades away early so the video plays clean, then a compact
          // caption fades in near the end of the scrub, aligned with the grid.
          if (heroText) {
            const fadeOut = clamp((progress - 0.1) / (0.32 - 0.1), 0, 1);
            gsap.set(heroText, {
              opacity: 1 - fadeOut,
              y: -24 * fadeOut,
              pointerEvents: fadeOut > 0.95 ? "none" : "auto",
            });
          }
          if (heroOutro) {
            const fadeIn = clamp((progress - 0.74) / (0.94 - 0.74), 0, 1);
            gsap.set(heroOutro, { opacity: fadeIn, y: 16 * (1 - fadeIn) });
          }
        },
      });

      cleanups.push(() => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        st.kill();
      });
    }

    // --- Nav shadow on scroll ---
    if (nav) {
      const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    }

    // --- Reveal on scroll ---
    const triggers = gsap.utils.toArray<HTMLElement>(".reveal, .reveal-stagger").map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => el.classList.add("in"),
      })
    );
    cleanups.push(() => triggers.forEach((t) => t.kill()));

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <>
      <Nav navRef={navRef} />
      <GlobeIntro />
      <Hero
        heroScrollRef={heroScrollRef}
        heroVideoRef={heroVideoRef}
        heroTextRef={heroTextRef}
        heroOutroRef={heroOutroRef}
      />
      <Intro />
      <Defi />
      <Programme />
      <Prix />
      <Partenaires />
      <Ressources />
      <Marquee />
      <Eligibilite />
      <Faq />
      <Inscription />
      <Stamp />
      <Footer />
    </>
  );
}

function Nav({ navRef }: { navRef: React.RefObject<HTMLElement | null> }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links: [string, string][] = [
    ["#defi", "Le défi"],
    ["#programme", "Programme"],
    ["#prix", "Prix"],
    ["#partenaires", "Partenaires"],
    ["#ressources", "Ressources"],
    ["#faq", "FAQ"],
  ];
  return (
    <header className="nav" id="siteNav" ref={navRef as React.RefObject<HTMLHeadElement>}>
      <div className="nav-inner">
        <div className="logo">
          <Image src="/logo-tamebi.png" alt="Tamebi Challenge" width={150} height={41} priority />
        </div>
        <nav className="links">
          {links.map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <a href="#inscription" className="btn btn-accent" style={{ padding: "11px 22px", fontSize: "13.5px" }}>
          S'inscrire
        </a>
        <button
          className="nav-toggle"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {mobileOpen && (
        <nav className="nav-mobile">
          {links.map(([href, label]) => (
            <a href={href} key={href} onClick={() => setMobileOpen(false)}>
              {label}
            </a>
          ))}
          <a href="#inscription" className="btn btn-accent" onClick={() => setMobileOpen(false)}>
            S'inscrire
          </a>
        </nav>
      )}
    </header>
  );
}

function Hero({
  heroScrollRef,
  heroVideoRef,
  heroTextRef,
  heroOutroRef,
}: {
  heroScrollRef: React.RefObject<HTMLDivElement | null>;
  heroVideoRef: React.RefObject<HTMLVideoElement | null>;
  heroTextRef: React.RefObject<HTMLDivElement | null>;
  heroOutroRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="hero-scroll" id="heroScroll" ref={heroScrollRef}>
      <div className="hero-stage">
        <video className="hero-video" ref={heroVideoRef} muted playsInline preload="auto" aria-hidden="true">
          <source src="/gpu-assemble.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="wrap hero-inner hero" ref={heroTextRef}>
          <span className="kicker">Powered by Tamebi</span>
          <h1>
            Le plus grand
            <br />
            hackathon <em>IA</em> du Bénin
          </h1>
          <p className="lead">
            30 heures pour héberger, servir et démontrer l'IA open-source la plus puissante du
            moment.
          </p>
          <div className="hero-cta">
            <a href="#inscription" className="btn btn-light">
              S'inscrire au Tamebi Challenge →
            </a>
          </div>
        </div>
        <div className="wrap hero hero-outro" ref={heroOutroRef}>
          <span className="kicker" style={{ marginBottom: 0 }}>
            Cotonou, Bénin · 19–20 sept. 2026*
          </span>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section>
      <div className="wrap intro-grid reveal">
        <div>
          <span className="kicker">Qui va se retrouver là</span>
          <h2>Ils viendront de tout le Bénin</h2>
          <p className="lead" style={{ marginBottom: "18px" }}>
            Étudiants, développeurs, data scientists et makers, unis par une même ambition : prouver
            que le Bénin peut déployer et exploiter l'intelligence artificielle la plus avancée du
            moment, pas seulement la consommer.
          </p>
          <p className="lead" style={{ marginBottom: "26px" }}>
            30 heures de sprint, un cluster GPU de niveau recherche, et un objectif commun — un
            endpoint API qui tourne, et une application qui le prouve.
          </p>
          <div className="intro-pills">
            <span className="intro-pill">30h non-stop</span>
            <span className="intro-pill">2 à 5 pers. / équipe</span>
            <span className="intro-pill">8×H200 / B200</span>
          </div>
        </div>
        <div className="ph intro-photo">
          <div className="intro-photo-badge">
            <span>🇧🇯</span>
            <span>Cotonou, Bénin</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stamp() {
  const arcs = [
    "M600,355 C550,220 220,200 150,120",
    "M600,355 C560,210 340,160 320,110",
    "M600,355 C580,190 500,140 480,100",
    "M600,355 C600,180 600,120 600,90",
    "M600,355 C620,190 700,140 720,100",
    "M600,355 C640,210 860,160 880,110",
    "M600,355 C650,220 980,200 1050,120",
  ];
  const dots: [number, number, number][] = [
    [220, 220, 0], [340, 190, 0.3], [480, 160, 0.6], [600, 140, 0.9],
    [720, 160, 1.2], [860, 190, 1.5], [980, 220, 1.8],
  ];
  return (
    <div className="stamp reveal">
      <div className="stamp-stars" aria-hidden="true" />
      <svg className="stamp-arcs" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <linearGradient id="stampGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c24f2a" stopOpacity={0} />
            <stop offset="45%" stopColor="#c24f2a" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#c24f2a" stopOpacity={0} />
          </linearGradient>
        </defs>
        {arcs.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="url(#stampGrad)" strokeWidth="1.4" />
        ))}
        {arcs.map((d, i) => (
          <path
            key={`flow-${i}`}
            d={d}
            fill="none"
            stroke="#ffb59b"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="stamp-flow"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}
        {dots.map(([x, y, delay], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill="#fff"
            className="stamp-dot"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </svg>
      <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
        <h2>
          TAMEBI
          <br />
          CHALLENGE
        </h2>
        <p>
          Le Bénin ne consomme pas l'IA la plus puissante du monde. <strong>Il la fait tourner.</strong>
        </p>
      </div>
    </div>
  );
}

function Defi() {
  return (
    <section id="defi">
      <div className="wrap">
        <span className="kicker">Le défi technique</span>
        <h2 className="reveal">Déployer, servir, démontrer</h2>
        <p className="lead reveal" style={{ marginBottom: "48px" }}>
          L'objectif n'est pas de faire un prototype de plus autour d'une API tierce fermée : c'est
          de mettre les mains dans l'inférence à très grande échelle, sur un modèle ouvert de pointe.
        </p>

        <div className="grid3 reveal-stagger">
          <SpotlightCard className="card">
            <div className="num">01</div>
            <h3>Héberger le modèle</h3>
            <p>
              Cluster réservé par Tamebi : <strong>8×NVIDIA H200 (141&nbsp;Go) ou 8×B200
              (192&nbsp;Go)</strong>, soit ~1,1 à 1,5&nbsp;To de VRAM cumulée. Cible principale :{" "}
              <strong>Kimi K2</strong> (Moonshot AI, ~1T paramètres MoE), qui tient confortablement
              dans ce budget GPU. Kimi K3 (2,8T paramètres, poids ouverts depuis le 27 juillet 2026)
              reste un objectif « stretch » si une quantification agressive et des tests de
              faisabilité le permettent.
            </p>
          </SpotlightCard>
          <SpotlightCard className="card">
            <div className="num">02</div>
            <h3>Servir via une API</h3>
            <p>
              Chaque équipe expose un endpoint fonctionnel (REST ou compatible OpenAI) pour
              interroger le modèle hébergé, avec une documentation minimale et une démonstration de
              latence/robustesse en conditions réelles.
            </p>
          </SpotlightCard>
          <SpotlightCard className="card">
            <div className="num">03</div>
            <h3>Construire une application</h3>
            <p>
              Libre choix du cas d'usage — assistant métier, outil éducatif, agent autonome,
              application grand public... L'idée compte moins que la qualité d'exécution :
              l'application doit réellement consommer l'API construite à l'étape 2.
            </p>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}

function Programme() {
  const steps = [
    {
      title: "Accueil, constitution des équipes & briefing technique",
      description:
        "H+0 → Présentation du modèle hébergé, attribution des accès au cluster 8×H200/B200, formation des équipes (2 à 5 personnes) et lancement officiel.",
      colors: GOLD,
    },
    {
      title: "Déploiement & premiers tests d'inférence",
      description:
        "H+0 → H+6 → Mise en place de l'endpoint API, premiers appels au modèle, validation de la charge GPU avec les mentors Tamebi sur place.",
      colors: INK,
    },
    {
      title: "Bloc de développement principal",
      description:
        "H+6 → H+22 → Construction de l'application, intégration continue à l'API, itérations avec les mentors. C'est le cœur du sprint.",
      colors: GOLD,
    },
    {
      title: "Finalisation & tests de charge",
      description:
        "H+22 → H+27 → Stabilisation de l'endpoint, tests en conditions réelles, préparation du pitch et des supports de démo.",
      colors: INK,
    },
    {
      title: "Démonstrations live & jury",
      description:
        "H+27 → H+30 → Chaque équipe présente son endpoint API et son application devant le jury Tamebi. Annonce des résultats et entretiens des 3 premières équipes.",
      colors: GOLD,
    },
  ];

  return (
    <section id="programme">
      <div className="wrap">
        <h2 className="reveal">Au programme</h2>
      </div>
      <HowItWorks features={steps} className="!bg-transparent dark:!bg-transparent" />
    </section>
  );
}

function Prix() {
  return (
    <section id="prix" className="alt">
      <div className="wrap">
        <span className="kicker">Récompenses</span>
        <h2 className="reveal">Le vrai prix : rejoindre Tamebi</h2>
        <p className="lead reveal" style={{ marginBottom: "36px" }}>
          Plutôt qu'une simple dotation, le Tamebi Challenge ouvre une porte d'entrée directe vers l'équipe
          Tamebi pour les talents qui se distinguent.
        </p>
        <div className="prize-list reveal-stagger">
          {[
            ["1", "Équipe 1ère place"],
            ["2", "Équipe 2ème place"],
            ["3", "Équipe 3ème place"],
          ].map(([rank, title]) => (
            <div className="prize-row" key={rank}>
              <div className="rank">{rank}</div>
              <div>
                <h4>{title}</h4>
                <p style={{ color: "var(--ink-soft)", fontSize: "14.5px" }}>
                  Entretien prioritaire pour rejoindre Tamebi, pour l'ensemble des membres de
                  l'équipe.
                </p>
              </div>
            </div>
          ))}
        </div>
        <p
          className="draft-note"
          style={{
            color: "var(--ink-soft)",
            borderLeftColor: "var(--green)",
            background: "var(--cream-2)",
            marginTop: "26px",
          }}
        >
          D'éventuelles dotations complémentaires (crédits cloud, matériel, cash prize) restent à
          confirmer selon le budget final validé par Tamebi.
        </p>
      </div>
    </section>
  );
}

function Partenaires() {
  const reasons: [IconComponent, string, string][] = [
    [Cloud, "Compléter la capacité de calcul", "Crédits cloud ou accès GPU additionnel pour sécuriser ou étendre le cluster réservé."],
    [GraduationCap, "Soutenir l'écosystème et la formation", "Universités, incubateurs et administrations : donnez de la visibilité à la relève tech du Bénin."],
    [Bullhorn, "Amplifier la portée de l'événement", "Couverture éditoriale, relais sur vos canaux, présence lors des démonstrations finales."],
    [Handshake, "Accéder à un vivier de talents", "Rencontrez en conditions réelles les meilleurs profils IA/dev du pays, avant même la remise des prix."],
  ];
  const tiers = [
    {
      tag: "Infrastructure",
      title: "Partenaire GPU / Cloud",
      text: "Vous fournissez ou complétez la capacité de calcul du hackathon.",
      perks: [
        "Logo mis en avant comme partenaire technique officiel",
        "Présence sur site pendant les 30h de l'événement",
        "Accès à l'ensemble des projets développés sur votre infra",
      ],
    },
    {
      tag: "Institutionnel",
      title: "Partenaire Institutionnel",
      text: "Universités, incubateurs, structures publiques du numérique.",
      perks: [
        "Co-branding sur les communications officielles",
        "Accès prioritaire aux CV des équipes finalistes",
        "Invitation à la remise des prix et aux entretiens Tamebi",
      ],
    },
    {
      tag: "Visibilité",
      title: "Partenaire Média & Communauté",
      text: "Vous amplifiez la portée du Tamebi Challenge auprès de votre audience.",
      perks: [
        "Couverture éditoriale dédiée avant/pendant/après l'événement",
        "Interviews des équipes finalistes",
        "Mentions croisées sur les réseaux sociaux de Tamebi",
      ],
    },
  ];

  return (
    <section id="partenaires" className="alt">
      <div className="wrap">
        <span className="kicker">Devenir partenaire</span>
        <h2 className="reveal">Associez votre marque à l'excellence tech béninoise</h2>
        <p className="lead reveal" style={{ marginBottom: "48px" }}>
          Le Tamebi Challenge est financé sur fonds Tamebi, mais l'événement gagne en portée avec des
          partenaires qui apportent de l'infrastructure, de la crédibilité institutionnelle ou de la
          visibilité. Trois façons de vous impliquer.
        </p>

        <div className="intro-grid" style={{ alignItems: "start", marginBottom: "64px" }}>
          <div className="reason-list reveal-stagger">
            {reasons.map(([Icon, title, text]) => (
              <div className="reason-row" key={title}>
                <div className="r-icon">
                  <Icon size={20} />
                </div>
                <div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="ph reveal" style={{ aspectRatio: "4/5" }} />
        </div>

        <h3 className="reveal" style={{ fontSize: "22px", marginBottom: "28px" }}>
          Formules de partenariat
        </h3>
        <div className="grid3 reveal-stagger">
          {tiers.map((t) => (
            <div className="tier-card" key={t.tag}>
              <span className="tier-tag">{t.tag}</span>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
              <ul className="check-list">
                {t.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="reveal" style={{ marginTop: "44px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <a
            href="mailto:partenaires@tamebi.ai?subject=Devenir%20partenaire%20Tamebi%20Challenge%202026"
            className="btn btn-dark"
          >
            Devenir partenaire →
          </a>
          <a href="#ressources" className="btn btn-light">
            Voir le dossier de sponsoring
          </a>
        </div>
        <p
          className="draft-note"
          style={{
            color: "var(--ink-soft)",
            borderLeftColor: "var(--green)",
            background: "var(--cream-2)",
            marginTop: "26px",
            marginBottom: 0,
          }}
        >
          Formules et contreparties indicatives — à valider avec Tamebi avant démarchage officiel des
          partenaires.
        </p>
      </div>
    </section>
  );
}

function Ressources() {
  const items: [string, string, string][] = [
    ["Règlement", "Règlement officiel Tamebi Challenge 2026", "Critères de notation, format des livrables, code de conduite. Publication à venir."],
    ["Kit équipes", "Identité visuelle & templates", "Logos, bannières réseaux sociaux et template de pitch pour chaque équipe inscrite."],
    ["Partenaires", "Dossier de sponsoring", "Vous voulez soutenir le Tamebi Challenge ? Le dossier partenaires sera disponible prochainement."],
  ];
  return (
    <section id="ressources">
      <div className="wrap">
        <span className="kicker">Ressources</span>
        <h2 className="reveal">Tout pour bien préparer votre équipe</h2>
        <p className="lead reveal" style={{ marginBottom: "40px" }}>
          Documents et supports mis à disposition avant et pendant l'événement.
        </p>
        <div className="grid3 reveal-stagger">
          {items.map(([tag, title, text]) => (
            <div className="res-card" key={tag}>
              <div className="ph" style={{ aspectRatio: "16/10" }} />
              <div className="body">
                <span className="res-tag">{tag}</span>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const logos = ["TAMEBI", "PARTENAIRE GPU", "UNIVERSITÉ PARTENAIRE", "ÉCOSYSTÈME TECH BÉNIN"];
  const track = [...logos, ...logos, ...logos];
  return (
    <section className="alt" style={{ padding: 0 }}>
      <div className="marquee">
        <div className="marquee-track">
          {track.map((l, i) => (
            <span className="partner-logo" key={i}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Eligibilite() {
  return (
    <section id="eligibilite">
      <div className="wrap">
        <span className="kicker">Qui peut participer</span>
        <h2 className="reveal">Conditions d'éligibilité</h2>
        <div className="grid3 reveal-stagger" style={{ marginTop: "32px" }}>
          <SpotlightCard className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="card-icon">
                <User size={16} />
              </span>{" "}
              Profil
            </h3>
            <p>
              Étudiants, développeurs, data scientists et makers basés au Bénin, avec des bases en
              développement logiciel et/ou en IA/ML.
            </p>
          </SpotlightCard>
          <SpotlightCard className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="card-icon">
                <Users size={16} />
              </span>{" "}
              Équipes
            </h3>
            <p>De 2 à 5 personnes par équipe. Les équipes mixtes (dev, design, produit) sont encouragées.</p>
          </SpotlightCard>
          <SpotlightCard className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="card-icon">
                <Laptop size={16} />
              </span>{" "}
              Matériel
            </h3>
            <p>
              Chaque équipe apporte son propre ordinateur portable ; l'accès au cluster GPU est
              fourni par Tamebi pendant toute la durée de l'événement.
            </p>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "Quel modèle sera réellement hébergé le jour J ?",
      a: (
        <>
          Le cluster réservé (8×H200 ou 8×B200) permet de servir confortablement{" "}
          <strong>Kimi K2</strong> (~1T paramètres MoE), qui sera la cible par défaut.{" "}
          <strong>Kimi K3</strong> (2,8T paramètres) reste envisagé en quantification 4-bit si les
          tests de faisabilité mémoire menés avant l'événement le confirment. Le choix définitif
          sera communiqué aux équipes avant le hackathon.
        </>
      ),
    },
    {
      q: "Dois-je financer l'infrastructure GPU moi-même ?",
      a: "Non. Tamebi finance et réserve le cluster 8×H200/B200 pour toute la durée de l'événement. Les équipes se concentrent sur le déploiement, le service API et l'application, pas sur l'achat de compute.",
    },
    {
      q: "Faut-il être expert en IA pour participer ?",
      a: "Non, mais des bases solides en développement logiciel sont nécessaires. Une bonne compréhension des API REST et un minimum de familiarité avec les LLM sont un plus.",
    },
    {
      q: "Comment sont sélectionnées les 3 équipes gagnantes ?",
      a: "Un jury Tamebi évalue chaque équipe sur trois critères : la robustesse de l'endpoint API, la qualité et la pertinence de l'application développée, et la clarté de la présentation technique.",
    },
    {
      q: "La participation est-elle payante ?",
      a: "Non, l'événement est entièrement financé sur fonds Tamebi. Les frais d'inscription, si applicables, seront précisés lors de l'ouverture officielle des candidatures.",
    },
  ];
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="alt">
      <div className="wrap" style={{ maxWidth: "820px" }}>
        <span className="kicker">FAQ</span>
        <h2 className="reveal">Questions fréquentes</h2>
        <div style={{ marginTop: "24px" }}>
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div className={`faq-item${isOpen ? " open" : ""}`} key={item.q}>
                <div
                  className="faq-q"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenIndex(isOpen ? -1 : i);
                    }
                  }}
                >
                  <span>{item.q}</span>
                  <span className="plus" />
                </div>
                <div className="faq-a" style={{ maxHeight: isOpen ? "400px" : "0px" }}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Inscription() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="inscription">
      <div className="wrap">
        <div className="cta-final reveal">
          <div className="stamp-stars" aria-hidden="true" />
          <div style={{ position: "relative", zIndex: 1 }}>
            <span className="kicker" style={{ color: "var(--accent-on-dark)" }}>
              Places limitées
            </span>
            <h2>Prêt à héberger l'IA la plus puissante du moment ?</h2>
            <p className="lead">
              Les inscriptions ouvriront prochainement. Laisse ton contact pour être informé en
              priorité dès l'ouverture du formulaire officiel.
            </p>
            <form
              className="cta-form"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                // TODO: brancher sur le vrai formulaire d'inscription (Google Form / Tally / API Tamebi)
              }}
            >
              <label htmlFor="notify-email" className="sr-only">
                Adresse email
              </label>
              <input id="notify-email" type="email" placeholder="ton@email.com" required />
              <button type="submit" className="btn btn-light">
                {submitted ? "Merci — à bientôt !" : "Être notifié →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div className="fcol">
            <h5>Tamebi Challenge 2026</h5>
            <div>Organisé et financé par Tamebi</div>
            <div>Cotonou, Bénin</div>
          </div>
          <div className="fcol">
            <h5>Contact</h5>
            <div>challenge@tamebi.ai</div>
            <div>tamebi.ai</div>
          </div>
          <div className="fcol">
            <h5>Navigation</h5>
            <div><a href="#defi">Le défi</a></div>
            <div><a href="#programme">Programme</a></div>
            <div><a href="#prix">Prix</a></div>
            <div><a href="#partenaires">Partenaires</a></div>
            <div><a href="#ressources">Ressources</a></div>
            <div><a href="#faq">FAQ</a></div>
          </div>
          <div className="fcol">
            <h5>Statut</h5>
            <div>Version brouillon — 10/08/2026</div>
            <div>Dates, lieu et dotations à valider</div>
          </div>
        </div>
        <div className="fbottom">
          <span>© 2026 Tamebi. Tous droits réservés.</span>
          <span>Fait avec ambition à Cotonou 🇧🇯</span>
        </div>
      </div>
    </footer>
  );
}
