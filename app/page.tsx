"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import Image from "next/image";
import Cloud from "reicon-react/icons/Cloud";
import GraduationCap from "reicon-react/icons/GraduationCap";
import Bullhorn from "reicon-react/icons/Bullhorn";
import Handshake from "reicon-react/icons/Handshake";
import User from "reicon-react/icons/User";
import Users from "reicon-react/icons/Users";
import Users2 from "reicon-react/icons/Users2";
import Laptop from "reicon-react/icons/Laptop";
import Scroll from "reicon-react/icons/Scroll";
import Palette from "reicon-react/icons/Palette";
import type { IconComponent } from "reicon-react/createIcon";
import HowItWorks from "@/components/ui/how-it-works";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { DefiDiagram } from "@/components/ui/defi-diagram";
import { PartenariatIllustration } from "@/components/ui/partenariat-illustration";
import { PrizeCarousel } from "@/components/ui/prize-carousel";

const GpuModelViewer = dynamic(
  () => import("@/components/ui/gpu-model-viewer").then((m) => m.GpuModelViewer),
  { ssr: false }
);
import GlobeIntro from "@/components/globe-intro";

const GOLD = { bg: "bg-[#c24f2a]/10", text: "text-[#c24f2a]", border: "border-[#c24f2a]/20" };
const INK = { bg: "bg-[#303034]/[0.05]", text: "text-[#303034]", border: "border-[#303034]/15" };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

// ScrollSmoother fakes scrolling with a CSS transform, so a plain
// <a href="#id"> anchor jump no longer lands in the right place. Worse:
// smoother.scrollTo(target, true) and tweening smoother.scrollTop both reuse
// the ambient wheel-scroll lag (the `smooth` constant), which keeps
// re-applying no matter how the position is set — window.scrollY reaches the
// target within ~1s but the visual transform then creeps for several MORE
// seconds, so a nav click looks like it lands somewhere wrong.
// smoother.scrollTo(target, false) is the one call confirmed to position
// instantly and correctly, so we drive our own eased tween and feed it that
// call every frame instead of letting GSAP proxy `scrollTop` directly.
function scrollToHash(e: React.MouseEvent<HTMLAnchorElement>, hash: string) {
  e.preventDefault();
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  const smoother = ScrollSmoother.get();
  if (smoother) {
    const startY = smoother.scrollTop();
    const targetY = el.getBoundingClientRect().top + startY;
    gsap.to(
      { y: startY },
      {
        y: targetY,
        duration: 0.9,
        ease: "power2.inOut",
        overwrite: true,
        onUpdate() {
          smoother.scrollTo(this.targets()[0].y, false);
        },
      }
    );
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
  window.history.pushState(null, "", hash);
}

export default function Page() {
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const heroStageRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroOutroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [fixedRoot, setFixedRoot] = useState<HTMLElement | null>(null);

  // The nav is portaled to #fixed-root (see layout.tsx) so its position:fixed
  // keeps working once ScrollSmoother puts a transform on the content wrapper.
  useEffect(() => {
    setFixedRoot(document.getElementById("fixed-root"));
  }, []);

  // ScrollSmoother wraps the whole page in inertia-smoothed scroll. It requires
  // pinning (not CSS position:sticky) for elements that need to stay put while
  // their section scrolls past — see hero-stage / globe-intro-stage below.
  useEffect(() => {
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.1,
      smoothTouch: 0.1,
    });
    return () => smoother.kill();
  }, []);

  // Hero video scroll-scrub + nav shadow + reveal-on-scroll, driven by GSAP
  // ScrollTrigger instead of hand-rolled rect/resize math.
  useEffect(() => {
    const heroScroll = heroScrollRef.current;
    const heroStage = heroStageRef.current;
    const video = heroVideoRef.current;
    const heroText = heroTextRef.current;
    const heroOutro = heroOutroRef.current;
    const cleanups: Array<() => void> = [];

    // --- Hero video scroll-scrub (pinned stage + parallaxed text layers) ---
    if (heroScroll && video) {
      let ready = video.readyState >= 1; // metadata may already be loaded before this runs
      const onLoadedMetadata = () => {
        ready = true;
        ScrollTrigger.refresh();
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      // iOS/Safari sometimes needs a play/pause cycle to decode the first frame for scrubbing
      video.play().then(() => video.pause()).catch(() => {});

      // Kicker/heading/lead/CTA drift at slightly different speeds as they fade
      // — a cheap parallax that gives the exit some depth instead of one flat block.
      const heroTextParts = heroText
        ? Array.from(heroText.querySelectorAll<HTMLElement>(".kicker, h1, .lead, .hero-cta"))
        : [];

      const st = ScrollTrigger.create({
        trigger: heroScroll,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        pin: heroStage,
        onUpdate: (self) => {
          if (!ready || !isFinite(video.duration)) return;
          const progress = self.progress;
          const target = progress * video.duration;
          if (Math.abs(video.currentTime - target) > 0.03) {
            video.currentTime = target;
          }

          // Intro text fades away early so the video plays clean, then a compact
          // caption fades in near the end of the scrub, aligned with the grid.
          const fadeOut = clamp((progress - 0.1) / (0.32 - 0.1), 0, 1);
          heroTextParts.forEach((part, i) => {
            const depth = 1 + i * 0.35;
            gsap.set(part, {
              opacity: 1 - fadeOut,
              y: -24 * fadeOut * depth,
              pointerEvents: fadeOut > 0.95 ? "none" : "auto",
            });
          });
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

    // --- Reveal on scroll (real GSAP tweens, not just a class toggle) ---
    gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
      gsap.set(el, { scale: 0.97 });
      const trig = ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }),
      });
      cleanups.push(() => trig.kill());
    });
    gsap.utils.toArray<HTMLElement>(".reveal-stagger").forEach((el) => {
      const children = gsap.utils.toArray<HTMLElement>(Array.from(el.children) as HTMLElement[]);
      const trig = ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => gsap.to(children, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.12 }),
      });
      cleanups.push(() => trig.kill());
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Nav shadow on scroll + entrance + magnetic CTA. Kept in its own effect,
  // keyed on fixedRoot: the nav mounts a render tick after fixedRoot is set
  // (it's portaled — see above), so navRef.current isn't ready any earlier.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const cleanups: Array<() => void> = [];

    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    gsap.fromTo(nav, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.15 });

    const accentBtn = nav.querySelector<HTMLElement>(".btn-accent");
    if (accentBtn) {
      const onMove = (e: MouseEvent) => {
        const rect = accentBtn.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        gsap.to(accentBtn, { x: relX * 0.3, y: relY * 0.3, duration: 0.3, ease: "power2.out" });
      };
      const onLeave = () => gsap.to(accentBtn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.4)" });
      accentBtn.addEventListener("mousemove", onMove);
      accentBtn.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        accentBtn.removeEventListener("mousemove", onMove);
        accentBtn.removeEventListener("mouseleave", onLeave);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [fixedRoot]);

  return (
    <>
      {fixedRoot && createPortal(<Nav navRef={navRef} />, fixedRoot)}
      <GlobeIntro />
      <Hero
        heroScrollRef={heroScrollRef}
        heroStageRef={heroStageRef}
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
            <a href={href} key={href} onClick={(e) => scrollToHash(e, href)}>
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#inscription"
          className="btn btn-accent"
          style={{ padding: "11px 22px", fontSize: "13.5px" }}
          onClick={(e) => scrollToHash(e, "#inscription")}
        >
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
            <a
              href={href}
              key={href}
              onClick={(e) => {
                setMobileOpen(false);
                scrollToHash(e, href);
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="#inscription"
            className="btn btn-accent"
            onClick={(e) => {
              setMobileOpen(false);
              scrollToHash(e, "#inscription");
            }}
          >
            S'inscrire
          </a>
        </nav>
      )}
    </header>
  );
}

function Hero({
  heroScrollRef,
  heroStageRef,
  heroVideoRef,
  heroTextRef,
  heroOutroRef,
}: {
  heroScrollRef: React.RefObject<HTMLDivElement | null>;
  heroStageRef: React.RefObject<HTMLDivElement | null>;
  heroVideoRef: React.RefObject<HTMLVideoElement | null>;
  heroTextRef: React.RefObject<HTMLDivElement | null>;
  heroOutroRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="hero-scroll" id="heroScroll" ref={heroScrollRef}>
      <div className="hero-stage" ref={heroStageRef}>
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
            <a href="#inscription" className="btn btn-light" onClick={(e) => scrollToHash(e, "#inscription")}>
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
          <span className="glyph" aria-hidden="true">
            <Users2 size={44} />
          </span>
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Scales the heading up once as it comes into view — a short, punchy "stamp"
  // moment right before the footer. (No pin/scrub: this used to sit mid-page
  // with content flowing after it; pinning here — right before the footer —
  // reserved scroll distance nothing filled, leaving a blank gap.)
  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    if (!section || !heading) return;

    gsap.set(heading, { scale: 0.85 });
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top 75%",
      once: true,
      onEnter: () => gsap.to(heading, { scale: 1, duration: 0.9, ease: "power2.out" }),
    });
    return () => st.kill();
  }, []);

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
    <div className="stamp reveal" ref={sectionRef}>
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
        <h2 ref={headingRef}>
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

        <DefiDiagram
          model={<GpuModelViewer className="gpu-model" />}
          steps={[
            {
              num: "01",
              title: "Héberger le modèle",
              description: (
                <>
                  Cluster réservé par Tamebi (<strong>8×NVIDIA H200 ou 8×B200</strong>, jusqu'à 1,5&nbsp;To de VRAM) pour héberger <strong>Kimi K2</strong> — et Kimi K3 en objectif stretch.
                </>
              ),
            },
            {
              num: "02",
              title: "Servir via une API",
              description:
                "Chaque équipe expose un endpoint REST (ou compatible OpenAI) qui interroge le modèle hébergé, avec une démonstration de latence et de robustesse en conditions réelles.",
            },
            {
              num: "03",
              title: "Construire une application",
              description:
                "Libre choix du cas d'usage, du moment que l'application consomme réellement l'API construite à l'étape 2.",
            },
          ]}
        />
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
        <PrizeCarousel
          items={[
            { rank: "1", title: "Équipe 1ère place", description: "Entretien prioritaire pour rejoindre Tamebi, pour l'ensemble des membres de l'équipe." },
            { rank: "2", title: "Équipe 2ème place", description: "Entretien prioritaire pour rejoindre Tamebi, pour l'ensemble des membres de l'équipe." },
            { rank: "3", title: "Équipe 3ème place", description: "Entretien prioritaire pour rejoindre Tamebi, pour l'ensemble des membres de l'équipe." },
          ]}
        />
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
          <div className="ph ph-light reveal" style={{ aspectRatio: "4/5" }}>
            <PartenariatIllustration className="partenariat-illustration" />
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
          <a href="#ressources" className="btn btn-light" onClick={(e) => scrollToHash(e, "#ressources")}>
            Voir le dossier de sponsoring
          </a>
        </div>
      </div>
    </section>
  );
}

function Ressources() {
  const items: [IconComponent, string, string, string][] = [
    [Scroll, "Règlement", "Règlement officiel Tamebi Challenge 2026", "Critères de notation, format des livrables, code de conduite. Publication à venir."],
    [Palette, "Kit équipes", "Identité visuelle & templates", "Logos, bannières réseaux sociaux et template de pitch pour chaque équipe inscrite."],
    [Handshake, "Partenaires", "Dossier de sponsoring", "Vous voulez soutenir le Tamebi Challenge ? Le dossier partenaires sera disponible prochainement."],
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
          {items.map(([Icon, tag, title, text], i) => (
            <div className="res-card" key={tag}>
              <div className={`ph ${["", "tone-b", "tone-c"][i]}`} style={{ aspectRatio: "16/10" }}>
                <span className="glyph" aria-hidden="true">
                  <Icon size={40} />
                </span>
              </div>
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
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevOpenIndex = useRef(openIndex);

  // GSAP-driven accordion: tweens to a real measured "auto" height instead of
  // the old max-height guess, so long answers never get clipped.
  useEffect(() => {
    const prev = prevOpenIndex.current;
    if (prev !== openIndex && prev !== -1 && answerRefs.current[prev]) {
      gsap.to(answerRefs.current[prev], { height: 0, opacity: 0, duration: 0.35, ease: "power2.in" });
    }
    if (openIndex !== -1 && answerRefs.current[openIndex]) {
      gsap.set(answerRefs.current[openIndex], { height: 0, opacity: 0 });
      gsap.to(answerRefs.current[openIndex], { height: "auto", opacity: 1, duration: 0.5, ease: "power2.out" });
    }
    prevOpenIndex.current = openIndex;
  }, [openIndex]);

  return (
    <section id="faq" className="alt">
      <div className="wrap" style={{ maxWidth: "820px" }}>
        <span className="kicker">FAQ</span>
        <h2 className="reveal">Questions fréquentes</h2>
        <div className="reveal-stagger" style={{ marginTop: "24px" }}>
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
                <div
                  className="faq-a"
                  ref={(el) => {
                    answerRefs.current[i] = el;
                  }}
                >
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
            <div><a href="#defi" onClick={(e) => scrollToHash(e, "#defi")}>Le défi</a></div>
            <div><a href="#programme" onClick={(e) => scrollToHash(e, "#programme")}>Programme</a></div>
            <div><a href="#prix" onClick={(e) => scrollToHash(e, "#prix")}>Prix</a></div>
            <div><a href="#partenaires" onClick={(e) => scrollToHash(e, "#partenaires")}>Partenaires</a></div>
            <div><a href="#ressources" onClick={(e) => scrollToHash(e, "#ressources")}>Ressources</a></div>
            <div><a href="#faq" onClick={(e) => scrollToHash(e, "#faq")}>FAQ</a></div>
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
