"use client";

// Coquille commune aux quatre espaces privés.
//
// Un seul châssis pour l'organisation, le jury, les mentors et les équipes :
// même rail, même topbar, même horloge. Ce qui change d'un rôle à l'autre,
// c'est uniquement la liste des sections passée en props. Un juré qui devient
// mentor le lendemain ne réapprend pas l'interface.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { IconComponent } from "reicon-react/createIcon";
import Search from "reicon-react/icons/Search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import { RANKED, EVENT, EVENT_PROGRESS, remainingLabel } from "@/lib/espaces-mock";

export type RoleId = "admin" | "jury" | "mentor" | "equipe";

export type DashSection = {
  /** Sert d'ancre : la section correspondante porte le même id. */
  id: string;
  label: string;
  icon: IconComponent;
  /** Compteur affiché à droite de l'entrée (demandes en attente, etc.). */
  count?: number;
  /** Passe le compteur en rouge : quelque chose attend une action. */
  hot?: boolean;
};

const ROLES: { id: RoleId; href: string; label: string; title: string }[] = [
  { id: "admin", href: "/espace/admin", label: "Orga", title: "Pilotage de l'événement" },
  { id: "jury", href: "/espace/jury", label: "Jury", title: "Notation des équipes" },
  { id: "mentor", href: "/espace/mentor", label: "Mentor", title: "Accompagnement des équipes" },
  { id: "equipe", href: "/espace/equipe", label: "Équipe", title: "Mon équipe" },
];

/** Suit la section visible pour éclairer l'entrée correspondante du rail.
 *
 *  IntersectionObserver plutôt qu'un écouteur de scroll : le navigateur fait le
 *  calcul hors du thread principal, et le rail reste juste pendant un défilement
 *  rapide. La marge basse à -55 % évite qu'une section à peine entamée en bas
 *  d'écran ne vole l'état actif à celle qu'on est en train de lire. */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-76px 0px -55% 0px", threshold: 0 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** Palette ⌘K.
 *
 *  Elle gagne vraiment sa place ici : pendant l'événement, une même personne
 *  saute en permanence entre une douzaine d'équipes et cinq sections, souvent
 *  avec une main sur le clavier et l'autre sur autre chose. Les douze équipes
 *  sont indexées, donc « wak » suffit pour atteindre les Wakandans, sans
 *  parcourir un tableau. */
function CommandPalette({
  open,
  setOpen,
  sections,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  sections: DashSection[];
}) {
  const router = useRouter();

  function go(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Aller à une section, une équipe, un espace…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        <CommandGroup heading="Sections">
          {sections.map((s) => (
            <CommandItem
              key={s.id}
              value={`section ${s.label}`}
              onSelect={() =>
                go(() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }))
              }
            >
              <s.icon size={15} />
              {s.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Équipes">
          {RANKED.map((t) => (
            <CommandItem
              key={t.id}
              // La ville est dans la valeur indexée mais pas affichée : chercher
              // « calavi » trouve l'équipe même si on a oublié son nom.
              value={`equipe ${t.name} ${t.city}`}
              onSelect={() => go(() => router.push("/espace/jury"))}
            >
              <span className="dash-mono" style={{ opacity: 0.5, width: 22 }}>
                {t.rank}
              </span>
              {t.name}
              <span style={{ marginLeft: "auto", opacity: 0.55, fontSize: 12 }}>{t.city}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Espaces">
          {ROLES.map((r) => (
            <CommandItem
              key={r.id}
              value={`espace ${r.label} ${r.title}`}
              onSelect={() => go(() => router.push(r.href))}
            >
              {r.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function DashShell({
  role,
  who,
  title,
  sections,
  children,
}: {
  role: RoleId;
  who: { name: string; role: string };
  /** Titre affiché dans la topbar collante. */
  title: string;
  sections: DashSection[];
  children: ReactNode;
}) {
  const active = useActiveSection(sections.map((s) => s.id));
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K. On intercepte avant que le navigateur n'ouvre sa propre barre
  // de recherche, d'où le preventDefault.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dash-shell">
      <aside className="dash-rail">
        <div className="dash-rail-brand">
          <Link href="/" aria-label="Retour à la page publique">
            <img src="/logov1.svg" alt="" className="dash-rail-mark" />
          </Link>
          <span className="dash-rail-event">
            Tamebi
            <br />
            Challenge 26
          </span>
        </div>

        <div className="dash-who">
          <span className="dash-who-avatar" aria-hidden="true">
            {who.name
              .split(/[\s'-]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]!.toUpperCase())
              .join("")}
          </span>
          <div>
            <div className="dash-who-name">{who.name}</div>
            <div className="dash-who-role">{who.role}</div>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Sections de l'espace">
          <div className="dash-nav-title">Sections</div>
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="dash-nav-item"
                data-active={active === s.id}
                aria-current={active === s.id ? "true" : undefined}
              >
                <Icon size={16} className="dash-nav-icon" />
                {s.label}
                {s.count != null && s.count > 0 && (
                  <span className={s.hot ? "dash-nav-count is-hot" : "dash-nav-count"}>
                    {s.count}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Échafaudage de conception. L'authentification n'étant pas branchée,
            c'est ce sélecteur qui permet de parcourir les quatre espaces pour
            les valider. Il disparaît le jour où le rôle vient de la session. */}
        <div className="dash-switcher">
          <div className="dash-switcher-label">Voir en tant que</div>
          <div className="dash-switcher-grid">
            {ROLES.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                title={r.title}
                className="dash-switcher-btn"
                data-active={role === r.id}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <span className="dash-topbar-title">{title}</span>
          {/* Le raccourci est affiché plutôt que caché : personne ne devine
              ⌘K, et une palette que personne n'ouvre ne sert à rien. */}
          <button type="button" className="dash-search" onClick={() => setPaletteOpen(true)}>
            <Search size={14} />
            <span className="dash-search-text">Rechercher</span>
            <kbd className="dash-kbd">⌘K</kbd>
          </button>
          {/* L'horloge est identique pour les quatre rôles : sur un format de
              30 h, « combien de temps reste-t-il » conditionne autant la
              décision d'un juré que celle d'une équipe. */}
          <div className="dash-clock">
            <span className="dash-clock-label">Reste</span>
            <span className="dash-clock-value">{remainingLabel()}</span>
            <div
              className="dash-clock-track"
              role="progressbar"
              aria-valuenow={EVENT_PROGRESS}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Événement écoulé à ${EVENT_PROGRESS} %, sur ${EVENT.totalHours} heures`}
            >
              <div className="dash-clock-fill" style={{ width: `${EVENT_PROGRESS}%` }} />
            </div>
          </div>
        </header>

        <main className="dash-body">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} sections={sections} />
      {/* Les notifications sortent en bas à droite, loin du rail et de la
          topbar : rien de ce qui compte ne se fait recouvrir. */}
      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
