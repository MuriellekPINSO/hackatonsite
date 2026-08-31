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
import Logout from "reicon-react/icons/Logout";
import ProfileCircle from "reicon-react/icons/ProfileCircle";
import AngleDown from "reicon-react/icons/AngleDown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ui/theme-toggle";
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
  who: { name: string; role: string; email: string };
  /** Nom de l'espace, premier segment du fil d'Ariane. Pour un participant
   *  c'est le nom de son équipe : c'est bien là qu'il se trouve. */
  title: string;
  sections: DashSection[];
  children: ReactNode;
}) {
  const initials = who.name
    .split(/[\s'-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  const active = useActiveSection(sections.map((s) => s.id));
  const activeSection = sections.find((s) => s.id === active);
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
          <span className="dash-rail-event">Édition 2026</span>
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

        {/* Sortie en pied de rail, séparée des sections par un filet : c'est la
            seule action de la colonne qui ne navigue pas dans la page, elle ne
            doit pas se confondre avec une entrée de sommaire. Elle double celle
            du menu de compte, à dessein : on la cherche des deux côtés. */}
        <Link href="/espace/login" className="dash-signout">
          <Logout size={16} />
          Déconnexion
        </Link>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          {/* Fil d'Ariane vivant. Il remplace un titre qui recopiait mot pour
              mot le <h1> visible 40px plus bas : deux fois la même information,
              dont une inutile. Le second segment suit la section à l'écran, ce
              qui donne enfin un repère quand on a défilé loin dans la page. */}
          <nav className="dash-crumb" aria-label="Fil d'Ariane">
            <span className="dash-crumb-root">{title}</span>
            {activeSection && (
              <>
                <span className="dash-crumb-sep" aria-hidden="true">
                  /
                </span>
                <span className="dash-crumb-current">{activeSection.label}</span>
              </>
            )}
          </nav>

          {/* Le raccourci est affiché plutôt que caché : personne ne devine
              ⌘K, et une palette que personne n'ouvre ne sert à rien. */}
          <button type="button" className="dash-search" onClick={() => setPaletteOpen(true)}>
            <Search size={14} />
            <span className="dash-search-text">Rechercher</span>
            <kbd className="dash-kbd">⌘K</kbd>
          </button>

          <div className="dash-topbar-actions">
            {/* L'horloge est identique pour les quatre rôles : sur un format de
                30 h, « combien de temps reste-t-il » conditionne autant la
                décision d'un juré que celle d'une équipe. Le title porte le
                contexte que les trois mots affichés ne peuvent pas tenir. */}
            <div
              className="dash-clock"
              title={`${EVENT_PROGRESS} % des ${EVENT.totalHours} h écoulées`}
            >
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

            <span className="dash-topbar-sep" aria-hidden="true" />

            <ThemeToggle className="dash-icon-btn" />

            {/* Compte. L'identité était dans le rail, sous le logo : elle
                occupait une carte entière pour une information qu'on lit une
                fois en arrivant, et elle disparaissait complètement dès que le
                rail se repliait en mobile. En pastille ronde ici, elle tient en
                32px, reste visible à toutes les tailles, et rassemble sous un
                seul clic les actions de compte, déconnexion comprise. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="dash-account" aria-label={`Compte de ${who.name}`}>
                  <span className="dash-account-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <AngleDown size={13} className="dash-account-chevron" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                <div className="dash-menu-head">
                  <div className="dash-menu-name">{who.name}</div>
                  <div className="dash-menu-mail">{who.email}</div>
                  <div className="dash-menu-role">{who.role}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/espace/equipe#membres">
                    <ProfileCircle size={15} />
                    Mon compte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/espace/login">
                    <Logout size={15} />
                    Se déconnecter
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
