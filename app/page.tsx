"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cloud from "reicon-react/icons/Cloud";
import GraduationCap from "reicon-react/icons/GraduationCap";
import Bullhorn from "reicon-react/icons/Bullhorn";
import Handshake from "reicon-react/icons/Handshake";
import User from "reicon-react/icons/User";
import Users from "reicon-react/icons/Users";
import Laptop from "reicon-react/icons/Laptop";
import HowItWorks from "@/components/ui/how-it-works";
import { CircularCarousel } from "@/components/ui/circular-carousel";
import GlobeIntro from "@/components/globe-intro";

const GOLD = { bg: "bg-[#c24f2a]/10", text: "text-[#c24f2a]", border: "border-[#c24f2a]/20" };
const INK = { bg: "bg-[#303034]/[0.05]", text: "text-[#303034]", border: "border-[#303034]/15" };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export default function Page() {
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroOutroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Hero video scroll-scrub + nav shadow + reveal-on-scroll + count-up stats.
  // Kept as plain DOM effects (like the original static site) since these are
  // one-shot presentational animations, not app state.
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
        update();
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      // iOS/Safari sometimes needs a play/pause cycle to decode the first frame for scrubbing
      video.play().then(() => video.pause()).catch(() => {});

      function update() {
        if (!ready || !isFinite(video!.duration)) return;
        const scrollableHeight = heroScroll!.offsetHeight - window.innerHeight;
        const rect = heroScroll!.getBoundingClientRect();
        const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(scrollableHeight, 0));
        const progress = scrollableHeight > 0 ? scrolled / scrollableHeight : 0;
        const target = progress * video!.duration;
        if (Math.abs(video!.currentTime - target) > 0.03) {
          video!.currentTime = target;
        }

        // Intro text fades away early so the video plays clean, then a compact
        // caption fades in near the end of the scrub, aligned with the grid.
        if (heroText) {
          const fadeOut = clamp((progress - 0.1) / (0.32 - 0.1), 0, 1);
          heroText.style.opacity = String(1 - fadeOut);
          heroText.style.transform = `translateY(${-24 * fadeOut}px)`;
          heroText.style.pointerEvents = fadeOut > 0.95 ? "none" : "auto";
        }
        if (heroOutro) {
          const fadeIn = clamp((progress - 0.74) / (0.94 - 0.74), 0, 1);
          heroOutro.style.opacity = String(fadeIn);
          heroOutro.style.transform = `translateY(${16 * (1 - fadeIn)}px)`;
        }
      }
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();

      cleanups.push(() => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
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
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // --- Count-up stats ---
    const counters = document.querySelectorAll<HTMLElement>("[data-count]");
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = parseInt(el.dataset.count || "0", 10);
          const prefix = el.dataset.prefix || "";
          const suffix = el.dataset.suffix || "";
          let cur = 0;
          const step = Math.max(1, Math.round(target / 40));
          const t = setInterval(() => {
            cur += step;
            if (cur >= target) {
              cur = target;
              clearInterval(t);
            }
            el.textContent = prefix + cur + suffix;
          }, 25);
          cio.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => cio.observe(el));
    cleanups.push(() => cio.disconnect());

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
      <Cascade />
      <Stamp />
      <Stats />
      <Defi />
      <Gallery />
      <Programme />
      <Prix />
      <Partenaires />
      <Ressources />
      <Marquee />
      <Eligibilite />
      <Faq />
      <Inscription />
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
        <video className="hero-video" ref={heroVideoRef} muted playsInline preload="auto">
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
        <div className="scroll-hint">
          <span>Défilez — le cluster s'assemble</span>
          <span className="dot" />
        </div>
        <div className="wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#c24f2a" stopOpacity="0" />
                <stop offset="50%" stopColor="#c24f2a" stopOpacity="1" />
                <stop offset="100%" stopColor="#c24f2a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="wave-line wave-anim" d="M0,60 C300,10 500,110 800,50 C950,20 1100,90 1200,60" />
            <path
              className="wave-line wave-anim"
              style={{ animationDelay: "-3s" }}
              d="M0,80 C300,110 500,20 800,80 C950,110 1100,30 1200,70"
              opacity={0.3}
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Subtle scroll parallax on the photo — mirrors the hero's scroll-scrub
  // technique at a much smaller scale, so this section has its own motion too.
  useEffect(() => {
    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = clamp(-center * 0.06, -22, 22);
      img.style.transform = `scale(1.12) translateY(${shift}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={sectionRef}>
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
          <Image
            ref={imgRef}
            src="/intro-team.jpg"
            alt="Équipe de développeurs et data scientists collaborant pendant un hackathon"
            fill
            sizes="(max-width: 860px) 100vw, 500px"
            style={{ objectFit: "cover" }}
          />
          <div className="intro-photo-badge">
            <span>🇧🇯</span>
            <span>Cotonou, Bénin</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cascade() {
  const items = [
    {
      id: "sprint",
      tag: "Sprint",
      title: "Dans le sprint, rien n'est acquis d'avance",
      description:
        "30 heures non-stop sur un cluster GPU partagé entre toutes les équipes : une seule fenêtre pour livrer un endpoint qui tient réellement la charge.",
    },
    {
      id: "equipe",
      tag: "Équipe",
      title: "Dans chaque équipe, de la rigueur et du culot",
      description:
        "Des devs, data scientists et makers qui conçoivent pour tenir en conditions réelles — pas pour l'effet d'une démo.",
    },
    {
      id: "vision",
      tag: "Vision",
      title: "Le Tamebi Challenge, c'est…",
      description:
        "Une vision et une méthode. Ici, l'excellence technique n'est pas une option en plus. C'est la seule métrique qui compte.",
    },
  ];
  return (
    <section className="cascade-carousel-section">
      <div className="stamp-stars" />
      <div className="wrap reveal" style={{ position: "relative", zIndex: 1 }}>
        <CircularCarousel items={items} />
        <p className="cascade-tagline">La question n'est pas de savoir si vous êtes prêts.</p>
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
      <div className="stamp-stars" />
      <svg className="stamp-arcs" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax meet">
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

function Stats() {
  return (
    <div className="stats">
      <div className="wrap reveal-stagger">
        <div className="stat">
          <h3 data-count="30" data-suffix="h">0h</h3>
          <span>Sprint non-stop</span>
        </div>
        <div className="stat">
          <h3>8×H200</h3>
          <span>ou 8×B200 réservés par Tamebi</span>
        </div>
        <div className="stat">
          <h3 data-count="3" data-prefix="Top ">Top 0</h3>
          <span>Équipes invitées en entretien Tamebi</span>
        </div>
        <div className="stat">
          <h3 data-count="100" data-suffix="%">0%</h3>
          <span>Financé sur fonds Tamebi</span>
        </div>
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
          <div className="card">
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
          </div>
          <div className="card">
            <div className="num">02</div>
            <h3>Servir via une API</h3>
            <p>
              Chaque équipe expose un endpoint fonctionnel (REST ou compatible OpenAI) pour
              interroger le modèle hébergé, avec une documentation minimale et une démonstration de
              latence/robustesse en conditions réelles.
            </p>
          </div>
          <div className="card">
            <div className="num">03</div>
            <h3>Construire une application</h3>
            <p>
              Libre choix du cas d'usage — assistant métier, outil éducatif, agent autonome,
              application grand public... L'idée compte moins que la qualité d'exécution :
              l'application doit réellement consommer l'API construite à l'étape 2.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const tones = ["", "tone-b", "tone-c"];
  const titles = [
    "Assistant IA",
    "Visage généré par IA",
    "Dashboard analytique",
    "Avatar futuriste",
    "Assistant vocal",
    "Réseau de neurones",
  ];

  return (
    <section className="alt">
      <div className="wrap">
        <div className="grid3 reveal-stagger">
          {titles.map((title, i) => (
            <div className="res-card" key={title}>
              <div className={`ph ${tones[i % tones.length]}`} style={{ aspectRatio: "1/1" }} />
              <div className="body">
                <h4>{title}</h4>
              </div>
            </div>
          ))}
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
        <span className="kicker">Programme</span>
        <h2 className="reveal">30 heures, sprint intensif</h2>
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
  const reasons: [any, string, string][] = [
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
          <div className="ph reveal" style={{ aspectRatio: "4/5" }}>
            <Image
              src="/res-partenaires.jpg"
              alt="Réseau symbolisant le partenariat et la croissance"
              fill
              sizes="(max-width: 860px) 100vw, 460px"
              style={{ objectFit: "cover" }}
            />
          </div>
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
          <div className="card">
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
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="card-icon">
                <Users size={16} />
              </span>{" "}
              Équipes
            </h3>
            <p>De 2 à 5 personnes par équipe. Les équipes mixtes (dev, design, produit) sont encouragées.</p>
          </div>
          <div className="card">
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
          </div>
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
          <div className="stamp-stars" />
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
              <input type="email" placeholder="ton@email.com" required />
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
