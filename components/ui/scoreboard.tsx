"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Trophy from "reicon-react/icons/Trophy";
import Search from "reicon-react/icons/Search";
import {
  CRITERIA,
  MAX_SCORE,
  initials,
  type CriterionKey,
  type RankedTeam,
} from "@/lib/competition";
import { POLL_MS } from "@/lib/use-competition";

type SortKey = "total" | CriterionKey;

type ScoreboardProps = {
  /** Classement partagé, fourni par useCompetition() dans la page. */
  teams: RankedTeam[];
  /** Horodatage du dernier relevé, en ms epoch. */
  updatedAt: number | null;
  /** L'API est injoignable. */
  error?: boolean;
  /** Un relevé est en cours. */
  refreshing?: boolean;
  /** Force un relevé immédiat. */
  onRefresh: () => void;
  /** Équipe à mettre en avant (choisie dans la recherche du hero). */
  focusTeamId?: string | null;
  /** Incrémenté à chaque sélection dans le hero : permet de re-scroller quand
   *  le visiteur choisit deux fois de suite la même équipe. */
  focusNonce?: number;
  /** Scroll fourni par la page : ScrollSmoother rend `scrollIntoView`
   *  inopérant, la page sait seule amener un élément au centre. */
  scrollToRow?: (el: HTMLElement) => void;
};

function formatAgo(seconds: number): string {
  if (seconds < 10) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.floor(minutes / 60)} h`;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="sb-delta is-flat" title="Position inchangée">
        <span aria-hidden="true">–</span>
        <span className="sr-only">position inchangée</span>
      </span>
    );
  const up = delta > 0;
  return (
    <span className={up ? "sb-delta is-up" : "sb-delta is-down"}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {Math.abs(delta)}
      <span className="sr-only">
        {up ? `gagne ${delta} places` : `perd ${Math.abs(delta)} places`}
      </span>
    </span>
  );
}

/**
 * Classement en direct de la compétition.
 *
 * Le composant est seedé avec le classement calculé côté module
 * (`initialTeams`) puis interroge /api/competition toutes les 20 s : la
 * première peinture affiche donc déjà un tableau complet, jamais un squelette.
 * Le polling est suspendu quand l'onglet passe en arrière-plan et relancé
 * immédiatement au retour : inutile de marteler l'API devant un onglet que
 * personne ne regarde, mais on ne veut pas non plus revenir sur un relevé
 * vieux de vingt minutes.
 */
export function Scoreboard({
  teams,
  updatedAt,
  error = false,
  refreshing = false,
  onRefresh,
  focusTeamId,
  focusNonce,
  scrollToRow,
}: ScoreboardProps) {
  const [now, setNow] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("total");
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Horloge de l'étiquette « il y a … ». Démarrée dans un effet (donc jamais
  // pendant le rendu serveur) pour que le HTML hydraté corresponde au serveur.
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  // Amène la ligne sous les yeux, mais seulement quand le nonce bouge.
  //
  // Le nonce veut dire « le visiteur a demandé à y aller » : c'est le cas d'une
  // sélection dans la recherche du hero, pas celui d'une inscription qui vient
  // d'aboutir. Là, la page met bien l'équipe en avant (focusTeamId) mais laisse
  // le nonce tel quel, pour que la ligne soit surlignée sans arracher le
  // visiteur au message de confirmation qu'il est en train de lire ; le lien
  // « Voir l'équipe dans le classement » est là pour ça.
  //
  // Dépendance sur le seul nonce, aussi, parce que `teams` change à chaque
  // relevé : l'inclure re-scrollerait toutes les 20 secondes.
  useEffect(() => {
    if (!focusNonce || !focusTeamId) return;
    const row = rowRefs.current[focusTeamId];
    if (!row) return;
    if (scrollToRow) scrollToRow(row);
    else row.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? teams.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.city.toLowerCase().includes(q) ||
            t.members.some((m) => m.name.toLowerCase().includes(q))
        )
      : teams;
    if (sort === "total") return filtered;
    // Le tri par critère ne change que l'ordre d'affichage : chaque ligne garde
    // le rang général calculé par l'API, sinon « #1 » voudrait dire deux choses
    // différentes selon le tri actif.
    return [...filtered].sort((a, b) => b.scores[sort] - a.scores[sort] || a.rank - b.rank);
  }, [teams, query, sort]);

  const podium = useMemo(() => teams.filter((t) => t.rank <= 3), [teams]);
  const leaderTotal = teams[0]?.total ?? MAX_SCORE;

  return (
    <section id="scoreboard">
      <div className="wrap">
        <div className="sb-head">
          <div>
            <span className="kicker">
              <span className={error ? "sb-live is-offline" : "sb-live"} aria-hidden="true">
                <span className="sb-live-dot" />
              </span>
              {error ? "Classement hors ligne" : "Classement en direct"}
            </span>
            <h2 className="reveal">Suivez la compétition minute par minute</h2>
            <p className="lead reveal">
              Les notes du jury sont publiées au fil des 30 heures : déploiement du modèle, tenue de
              l'API sous charge, application livrée et pitch final. Le tableau se met à jour tout
              seul, sans rechargement.
            </p>
          </div>
          <div className="sb-status">
            <span className="sb-status-time">
              {error
                ? "Reconnexion en cours…"
                : updatedAt && now
                  ? `Mis à jour ${formatAgo(Math.max(0, Math.round((now - updatedAt) / 1000)))}`
                  : "Chargement du relevé…"}
            </span>
            <button
              type="button"
              className="sb-refresh"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
          </div>
        </div>

        {/* `reveal` sur la liste, pas `reveal-stagger` : ce dernier cache chaque
            enfant en CSS et ne le révèle qu'une fois via GSAP. Sur un podium qui
            change en direct, une équipe qui entre dans le top 3 après le
            déclenchement du ScrollTrigger resterait invisible. */}
        <ol className="sb-podium reveal">
          {podium.map((team) => (
            <li className={`sb-podium-card sb-rank-${team.rank}`} key={team.id}>
              <span className="sb-podium-rank">
                {team.rank === 1 ? <Trophy size={18} aria-hidden="true" /> : null}#{team.rank}
              </span>
              <h3>{team.name}</h3>
              <p className="sb-podium-tagline">{team.tagline}</p>
              <div className="sb-podium-foot">
                <span className="sb-podium-score">
                  {team.total}
                  <span className="sb-podium-max">/{MAX_SCORE}</span>
                </span>
                <DeltaBadge delta={team.delta} />
              </div>
            </li>
          ))}
        </ol>

        <div className="sb-controls reveal">
          <div className="sb-filter">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Filtrer le classement (équipe, ville, participant)"
              aria-label="Filtrer le classement"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="sb-sort">
            <label htmlFor="sb-sort-select">Trier par</label>
            <select
              id="sb-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="total">Score total</option>
              {CRITERIA.map((c) => (
                <option value={c.key} key={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sb-table-wrap reveal">
          <table className="sb-table">
            <caption className="sr-only">
              Classement des équipes du Tamebi Challenge 2026, mis à jour en direct
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sb-col-rank">
                  #
                </th>
                <th scope="col">Équipe</th>
                {CRITERIA.map((c) => (
                  <th scope="col" className="sb-col-criterion" key={c.key} title={c.label}>
                    {c.short}
                  </th>
                ))}
                <th scope="col" className="sb-col-total">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((team) => (
                <tr
                  key={team.id}
                  ref={(el) => {
                    rowRefs.current[team.id] = el;
                  }}
                  className={team.id === focusTeamId ? "is-focused" : undefined}
                >
                  <td className="sb-col-rank">
                    <span className="sb-rank-value">{team.rank}</span>
                    <DeltaBadge delta={team.delta} />
                  </td>
                  <td>
                    <div className="sb-team">
                      <span className="sb-team-avatar" aria-hidden="true">
                        {initials(team.name)}
                      </span>
                      <div className="sb-team-body">
                        <span className="sb-team-name">{team.name}</span>
                        <span className="sb-team-meta">
                          {team.city} · {team.members.map((m) => m.name).join(", ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  {CRITERIA.map((c) => (
                    <td className="sb-col-criterion" key={c.key}>
                      <span className="sb-criterion-value">{team.scores[c.key]}</span>
                      <span className="sb-criterion-bar" aria-hidden="true">
                        <span style={{ width: `${(team.scores[c.key] / c.max) * 100}%` }} />
                      </span>
                    </td>
                  ))}
                  <td className="sb-col-total">
                    <span className="sb-total-value">{team.total}</span>
                    <span className="sb-total-bar" aria-hidden="true">
                      <span style={{ width: `${(team.total / leaderTotal) * 100}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="sb-empty" colSpan={CRITERIA.length + 3}>
                    Aucune équipe ne correspond à « {query.trim()} ».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="sb-foot">
          Chaque critère est noté sur {CRITERIA[0].max} points par le jury, soit {MAX_SCORE} points
          au total. Relevé automatique toutes les {POLL_MS / 1000} secondes.
        </p>
      </div>
    </section>
  );
}

export default Scoreboard;
