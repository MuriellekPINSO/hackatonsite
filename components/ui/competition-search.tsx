"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Search from "reicon-react/icons/Search";
import {
  initials,
  searchCompetition,
  type RankedTeam,
  type SearchHit,
} from "@/lib/competition";

type CompetitionSearchProps = {
  teams: RankedTeam[];
  /** Appelé avec l'id de l'équipe à mettre en avant dans le scoreboard. */
  onSelectTeam: (teamId: string) => void;
  placeholder?: string;
};

/**
 * Champ de recherche du hero : une seule entrée pour les équipes ET les
 * participants. Sélectionner un participant met en avant son équipe : c'est la
 * ligne du scoreboard qui est la destination utile dans les deux cas.
 *
 * Le panneau de résultats suit le pattern combobox ARIA (`aria-activedescendant`
 * plutôt que le focus DOM) : les flèches parcourent la liste sans jamais sortir
 * le focus de l'input, donc on peut continuer à taper au milieu de la
 * navigation clavier.
 */
export function CompetitionSearch({
  teams,
  onSelectTeam,
  placeholder = "Rechercher une équipe ou un participant…",
}: CompetitionSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => searchCompetition(query, teams), [query, teams]);

  // Une frappe peut raccourcir la liste sous l'index actif : on le ramène dans
  // les bornes plutôt que de laisser aria-activedescendant pointer dans le vide.
  useEffect(() => {
    setActive((i) => (hits.length === 0 ? 0 : Math.min(i, hits.length - 1)));
  }, [hits.length]);

  // Clic en dehors → on referme, sans toucher à la requête (le visiteur
  // retrouve sa recherche s'il revient dans le champ).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (hit: SearchHit) => {
    onSelectTeam(hit.team.id);
    setOpen(false);
    setQuery(hit.kind === "team" ? hit.team.name : hit.member.name);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (hits.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + hits.length) % hits.length);
      return;
    }
    if (e.key === "Enter" && open && hits[active]) {
      e.preventDefault();
      commit(hits[active]);
    }
  };

  const showPanel = open && query.trim().length > 0;
  const listboxId = "hero-search-results";

  return (
    <div className="hero-search" ref={rootRef}>
      <div className="hero-search-field">
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && hits[active] ? `hero-hit-${active}` : undefined}
          aria-label="Rechercher une équipe ou un participant"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="hero-search-clear"
            aria-label="Effacer la recherche"
            onClick={() => {
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {showPanel && (
        <div className="hero-search-panel">
          {hits.length === 0 ? (
            <p className="hero-search-empty">
              Aucune équipe ni participant pour « {query.trim()} ».
            </p>
          ) : (
            <ul className="hero-search-list" id={listboxId} role="listbox">
              {hits.map((hit, i) => (
                <li
                  key={hit.kind === "team" ? `t-${hit.team.id}` : `m-${hit.team.id}-${hit.member.name}`}
                  id={`hero-hit-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "hero-search-hit is-active" : "hero-search-hit"}
                  onPointerEnter={() => setActive(i)}
                  // pointerdown, pas click : le handler « clic en dehors »
                  // écoute lui aussi pointerdown et refermerait le panneau
                  // avant que le click n'arrive jamais à cette ligne.
                  onPointerDown={(e) => {
                    e.preventDefault();
                    commit(hit);
                  }}
                >
                  <span
                    className={
                      hit.kind === "team" ? "hero-search-avatar is-team" : "hero-search-avatar"
                    }
                    aria-hidden="true"
                  >
                    {initials(hit.kind === "team" ? hit.team.name : hit.member.name)}
                  </span>
                  <span className="hero-search-hit-body">
                    <span className="hero-search-hit-name">
                      {hit.kind === "team" ? hit.team.name : hit.member.name}
                    </span>
                    <span className="hero-search-hit-meta">
                      {hit.kind === "team"
                        ? `${hit.team.city} · ${hit.team.members.length} membres`
                        : `${hit.member.role} · ${hit.team.name}`}
                    </span>
                  </span>
                  <span className="hero-search-hit-rank">
                    <span className="hero-search-kind">
                      {hit.kind === "team" ? "Équipe" : "Participant"}
                    </span>
                    <span className="hero-search-rank-value">#{hit.team.rank}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default CompetitionSearch;
