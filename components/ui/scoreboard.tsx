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
  type TeamStatus,
} from "@/lib/competition";
import { POLL_MS } from "@/lib/use-competition";
import RollingNumber from "@/components/ui/rolling-number";
import GlowBorder from "@/components/ui/glow-border";
import { useFlipRows } from "@/lib/use-flip-rows";

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

/** Libellé et ton du badge d'état affiché à côté du nom d'équipe. */
const STATUS_LABEL: Record<TeamStatus, string> = {
  inscrite: "Inscrite",
  "en-lice": "En lice",
  qualifiee: "Qualifiée",
  "hors-course": "Hors course",
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

function StatusPill({ status }: { status: TeamStatus }) {
  return <span className={`sb-status-pill is-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
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
  const [moved, setMoved] = useState<ReadonlySet<string>>(() => new Set());
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const tableWrapRef = useRef<HTMLDivElement>(null);

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

    // Deux défilements à faire, dans cet ordre : le tableau a son PROPRE
    // scrollport (hauteur bornée, en-tête collant), donc amener la section
    // sous les yeux ne suffit pas si la ligne est hors de sa fenêtre interne.
    // Calculé en coordonnées viewport plutôt qu'avec offsetTop : l'offsetParent
    // d'un <tr> n'est pas le conteneur qui défile.
    const wrap = tableWrapRef.current;
    if (wrap && wrap.scrollHeight > wrap.clientHeight) {
      const rowRect = row.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      wrap.scrollTo({
        top:
          wrap.scrollTop +
          rowRect.top -
          wrapRect.top -
          (wrap.clientHeight - rowRect.height) / 2,
        behavior: "smooth",
      });
    }

    if (scrollToRow) scrollToRow(row);
    else row.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  // Surligne brièvement les lignes dont le RANG a changé depuis le relevé
  // précédent. Le `delta` porté par l'API compare au classement de la veille
  // (previousRank) et reste donc affiché en permanence ; ce flash-ci dit
  // « ça vient de bouger, sous tes yeux », ce qui est la promesse du direct.
  //
  // Le tout premier relevé ne déclenche rien : arriver sur la page n'est pas un
  // mouvement, et faire clignoter les douze lignes d'entrée serait du bruit.
  const lastRanks = useRef<Record<string, number> | null>(null);
  useEffect(() => {
    const current: Record<string, number> = {};
    for (const team of teams) current[team.id] = team.rank;
    const previous = lastRanks.current;
    lastRanks.current = current;
    if (!previous) return;

    const changed = teams
      .filter((team) => previous[team.id] !== undefined && previous[team.id] !== team.rank)
      .map((team) => team.id);
    if (changed.length === 0) return;

    setMoved(new Set(changed));
    const timer = setTimeout(() => setMoved(new Set()), 2_400);
    return () => clearTimeout(timer);
  }, [teams]);

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

  // Les lignes GLISSENT vers leur nouvelle place quand le classement bouge ou
  // que le tri change, au lieu de sauter. Voir lib/use-flip-rows.ts.
  useFlipRows(rowRefs, [rows]);

  const podium = useMemo(() => teams.filter((t) => t.rank <= 3), [teams]);
  const leaderTotal = teams[0]?.total ?? MAX_SCORE;

  // Chiffres de tête de section, tous dérivés du même relevé que le tableau :
  // aucune donnée inventée, et ils bougent avec lui.
  const stats = useMemo(() => {
    const participants = teams.reduce((sum, t) => sum + t.members.length, 0);
    const average = teams.length
      ? Math.round(teams.reduce((sum, t) => sum + t.total, 0) / teams.length)
      : 0;
    // Avance du leader sur son dauphin : la seule mesure qui dit d'un coup
    // d'œil si la compétition est jouée ou pas.
    const lead = teams.length >= 2 ? teams[0].total - teams[1].total : 0;
    return { participants, average, lead };
  }, [teams]);

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

        {/* `reveal` et pas `reveal-stagger` partout dans cette section : ce
            dernier cache chaque enfant en CSS et ne le révèle qu'une fois via
            GSAP. Sur des blocs qui changent en direct, un élément qui apparaît
            après le déclenchement du ScrollTrigger resterait invisible. */}
        <ul className="sb-stats reveal">
          <li>
            <span className="sb-stat-value">
              <RollingNumber value={teams.length} />
            </span>
            <span className="sb-stat-label">Équipes classées</span>
          </li>
          <li>
            <span className="sb-stat-value">
              <RollingNumber value={stats.participants} />
            </span>
            <span className="sb-stat-label">Participants</span>
          </li>
          <li>
            <span className="sb-stat-value">
              <RollingNumber value={stats.average} />
              <span className="sb-stat-unit">/{MAX_SCORE}</span>
            </span>
            <span className="sb-stat-label">Score moyen</span>
          </li>
          <li>
            <span className="sb-stat-value">
              {stats.lead > 0 ? "+" : ""}
              <RollingNumber value={stats.lead} />
              <span className="sb-stat-unit">pts</span>
            </span>
            <span className="sb-stat-label">Avance du leader</span>
          </li>
        </ul>

        <ol className="sb-podium reveal">
          {podium.map((team) => (
            <li className={`sb-podium-card sb-rank-${team.rank}`} key={team.id}>
              {/* Filet lumineux réservé au leader : c'est le seul endroit de la
                  page où la première place doit se voir sans avoir à lire. */}
              {team.rank === 1 && (
                <GlowBorder
                  glowColor="#f4d590"
                  tailColor="rgba(223,169,60,.5)"
                  baseColor="rgba(223,169,60,.07)"
                  speed={30}
                  radius={20}
                  borderWidth={1.5}
                />
              )}
              <div className="sb-podium-top">
                <span className={`sb-medal sb-medal-${team.rank}`} aria-hidden="true">
                  {team.rank === 1 ? <Trophy size={16} /> : team.rank}
                </span>
                <span className="sb-podium-rank">#{team.rank}</span>
                <DeltaBadge delta={team.delta} />
              </div>
              <h3>{team.name}</h3>
              <p className="sb-podium-tagline">{team.tagline}</p>
              <p className="sb-podium-meta">
                {team.city} · {team.members.length} participants
              </p>
              <div className="sb-podium-foot">
                <span className="sb-podium-score">
                  <RollingNumber value={team.total} />
                  <span className="sb-podium-max">/{MAX_SCORE}</span>
                </span>
                <StatusPill status={team.status} />
              </div>
              {/* Le détail par critère, sur le podium aussi : sans lui, deux
                  équipes à 82 points se ressemblent, alors que l'une peut tout
                  devoir à son infra et l'autre à sa démo. */}
              <ul className="sb-podium-criteria">
                {CRITERIA.map((c) => (
                  <li key={c.key}>
                    <span className="sb-podium-criterion-label" title={c.label}>
                      {c.short}
                    </span>
                    <span className="sb-criterion-bar" aria-hidden="true">
                      <span style={{ width: `${(team.scores[c.key] / c.max) * 100}%` }} />
                    </span>
                    <span className="sb-podium-criterion-value">{team.scores[c.key]}</span>
                  </li>
                ))}
              </ul>
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
            {query && (
              <button
                type="button"
                className="sb-filter-clear"
                onClick={() => setQuery("")}
                aria-label="Effacer le filtre"
              >
                ✕
              </button>
            )}
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

        {/* Compte des lignes visibles : sans lui, un filtre qui ne laisse que
            deux équipes sur douze se lit comme un classement à deux équipes.
            `aria-live` parce que le tableau se met à jour sans rechargement. */}
        <p className="sb-count" aria-live="polite">
          {rows.length === teams.length
            ? `${teams.length} équipes au classement`
            : `${rows.length} sur ${teams.length} équipes`}
        </p>

        <div className="sb-table-wrap reveal" ref={tableWrapRef}>
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
              {rows.map((team) => {
                const classes = ["sb-row"];
                if (team.rank <= 3) classes.push("is-podium");
                if (team.id === focusTeamId) classes.push("is-focused");
                if (moved.has(team.id)) classes.push("is-moved");
                return (
                  <tr
                    key={team.id}
                    ref={(el) => {
                      rowRefs.current[team.id] = el;
                    }}
                    className={classes.join(" ")}
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
                          <span className="sb-team-name">
                            {team.name}
                            <StatusPill status={team.status} />
                          </span>
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
                      <span className="sb-total-value">
                        <RollingNumber value={team.total} />
                      </span>
                      <span className="sb-total-bar" aria-hidden="true">
                        <span style={{ width: `${(team.total / leaderTotal) * 100}%` }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
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
