"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import Cloud from "reicon-react/icons/Cloud";
import GraduationCap from "reicon-react/icons/GraduationCap";
import Bullhorn from "reicon-react/icons/Bullhorn";
import Handshake from "reicon-react/icons/Handshake";
import User from "reicon-react/icons/User";
import Users from "reicon-react/icons/Users";
import Laptop from "reicon-react/icons/Laptop";
import Scroll from "reicon-react/icons/Scroll";
import Palette from "reicon-react/icons/Palette";
import Sun from "reicon-react/icons/Sun";
import Moon from "reicon-react/icons/Moon";
import type { IconComponent } from "reicon-react/createIcon";
import HowItWorks from "@/components/ui/how-it-works";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { DefiDiagram } from "@/components/ui/defi-diagram";
import { PrizeCarousel } from "@/components/ui/prize-carousel";
import { TamebiLogo } from "@/components/ui/tamebi-logo";
import InteractiveLines from "@/components/ui/interactive-lines";
import FireworkCursor from "@/components/ui/firework-cursor";
import LiquidCarveButton from "@/components/ui/liquid-carve-button";

const GpuModelViewer = dynamic(
  () => import("@/components/ui/gpu-model-viewer").then((m) => m.GpuModelViewer),
  { ssr: false }
);
import GlobeIntro from "@/components/globe-intro";

const TEAL = { bg: "bg-[#44adab]/10", text: "text-[#44adab]", border: "border-[#44adab]/20" };
const INK = { bg: "bg-[#303034]/[0.05]", text: "text-[#303034]", border: "border-[#303034]/15" };

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

  // Reveal on scroll, driven by GSAP ScrollTrigger.
  useEffect(() => {
    const cleanups: Array<() => void> = [];

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

    // Nav starts dark (matching the Globe/Hero intro it sits over) and turns
    // light/solid once that dark intro has fully scrolled past — i.e. once
    // the visitor reaches the white content pages, not on the first pixel
    // of scroll (rect-based, not scrollY-based, since ScrollSmoother drives
    // scroll via a transform that a raw scrollY threshold can't track).
    const heroEl = document.getElementById("heroScroll");
    const onScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 12);
      const heroBottom = heroEl?.getBoundingClientRect().bottom ?? 0;
      nav.classList.toggle("nav-light", heroBottom <= 0);
    };
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
      <Hero />
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

function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Reads the theme the blocking init script (layout.tsx) already stamped on
  // <html>. Deferred to an effect (rather than a lazy useState initializer)
  // so the very first client render matches the server's — otherwise the
  // sun/moon icon would mismatch and trigger a hydration warning.
  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("tamebi-theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : "theme-toggle"}
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      {showLabel && <span>{theme === "dark" ? "Thème clair" : "Thème sombre"}</span>}
    </button>
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
    <>
      <div className="nav-announce">
        <a href="#inscription" onClick={(e) => scrollToHash(e, "#inscription")}>
          Inscriptions bientôt ouvertes — sois notifié en priorité <span aria-hidden="true">→</span>
        </a>
      </div>
      <header className="nav" id="siteNav" ref={navRef as React.RefObject<HTMLHeadElement>}>
        <div className="nav-inner">
          <div className="nav-left">
            <div className="logo">
              <TamebiLogo className="nav-logo" />
            </div>
            <nav className="links">
              {links.map(([href, label]) => (
                <a href={href} key={href} onClick={(e) => scrollToHash(e, href)}>
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div className="nav-right">
            <ThemeToggle />
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
          <ThemeToggle className="theme-toggle-mobile" showLabel />
        </nav>
      )}
      </header>
    </>
  );
}

function Hero() {
  return (
    <section className="hero-scroll" id="heroScroll">
      <div className="hero-stage">
        <InteractiveLines
          backgroundColor="#000000"
          lineColor="#ffffff"
          lineWidth={1}
          minLines={8}
          maxLines={22}
          style={{ zIndex: 0, opacity: 0.5 }}
        />
        <div className="hero-firework">
          <FireworkCursor
            label={false}
            color="#ffffff"
            colors={["#ffffff", "#ffffff"]}
            density={18}
            size={0.8}
            lifetime={1}
            bloomStrength={15}
          />
        </div>
        <div className="wrap hero-inner hero reveal">
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
            <LiquidCarveButton
              label="S'inscrire au Tamebi Challenge →"
              link="#inscription"
              onClick={(e) => scrollToHash(e as React.MouseEvent<HTMLAnchorElement>, "#inscription")}
              colors={{ fill: "#ffffff", textColor: "#131314" }}
              blob={{ color: "#44adab", size: 70, smoothness: 50 }}
              font={{ fontSize: "14px", fontWeight: 600 }}
              rounded={100}
              padding="13px 26px"
            />
          </div>
          <p className="hero-meta">Cotonou, Bénin · 19–20 sept. 2026*</p>
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
          <Image
            src="/student4.png"
            alt="Étudiantes lors d'un hackathon"
            fill
            sizes="(max-width: 860px) 100vw, 500px"
            style={{ objectFit: "cover" }}
          />
          <span className="intro-photo-dot" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function Stamp() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  // Scales the logo up once as it comes into view — a short, punchy "stamp"
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
            <stop offset="0%" stopColor="#44adab" stopOpacity={0} />
            <stop offset="45%" stopColor="#44adab" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#44adab" stopOpacity={0} />
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
            stroke="#ffffff"
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
        <div className="stamp-logo-wrap" ref={headingRef}>
          <TamebiLogo className="stamp-logo" light scrollTrigger />
        </div>
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
      colors: TEAL,
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
      colors: TEAL,
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
      colors: TEAL,
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
            <Image
              src="/par.png"
              alt="Poignée de main entre deux partenaires"
              fill
              sizes="(max-width: 860px) 100vw, 500px"
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
  const [form, setForm] = useState({ team: "", contact: "", email: "", phone: "", size: "2", city: "" });

  const field =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Inscription Tamebi Challenge 2026 — ${form.team}`;
    const body = [
      `Nom de l'équipe : ${form.team}`,
      `Contact principal : ${form.contact}`,
      `Email : ${form.email}`,
      `Téléphone / WhatsApp : ${form.phone}`,
      `Nombre de membres : ${form.size}`,
      form.city && `Ville / université : ${form.city}`,
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:challenge@tamebi.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

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
              Inscris ton équipe (2 à 5 personnes) au Tamebi Challenge 2026 — on te recontacte pour
              confirmer ta place.
            </p>
            {submitted ? (
              <p className="reg-success">
                Merci{form.contact ? ` ${form.contact}` : ""} — ton client email s'est ouvert avec les
                infos pré-remplies, il ne reste plus qu'à l'envoyer !
              </p>
            ) : (
              <form className="reg-form" onSubmit={handleSubmit}>
                <div className="reg-field">
                  <label htmlFor="reg-team">Nom de l'équipe</label>
                  <input id="reg-team" required value={form.team} onChange={field("team")} placeholder="Les Wakandans du GPU" />
                </div>
                <div className="reg-field">
                  <label htmlFor="reg-contact">Contact principal</label>
                  <input id="reg-contact" required value={form.contact} onChange={field("contact")} placeholder="Prénom Nom" />
                </div>
                <div className="reg-field">
                  <label htmlFor="reg-email">Email</label>
                  <input id="reg-email" type="email" required value={form.email} onChange={field("email")} placeholder="ton@email.com" />
                </div>
                <div className="reg-field">
                  <label htmlFor="reg-phone">Téléphone / WhatsApp</label>
                  <input id="reg-phone" type="tel" required value={form.phone} onChange={field("phone")} placeholder="+229 ..." />
                </div>
                <div className="reg-field">
                  <label htmlFor="reg-size">Membres de l'équipe</label>
                  <select id="reg-size" value={form.size} onChange={field("size")}>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
                <div className="reg-field">
                  <label htmlFor="reg-city">Ville / université (optionnel)</label>
                  <input id="reg-city" value={form.city} onChange={field("city")} placeholder="Cotonou, UAC..." />
                </div>
                <button type="submit" className="btn btn-light reg-submit">
                  S'inscrire →
                </button>
              </form>
            )}
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
