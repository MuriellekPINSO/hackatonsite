"use client";

import { useCallback, useEffect, useState } from "react";
import { TEAMS, rankTeams, type RankedTeam } from "@/lib/competition";

/** Intervalle de rafraîchissement du classement, en millisecondes. */
export const POLL_MS = 20_000;

export type CompetitionState = {
  teams: RankedTeam[];
  /** Horodatage du dernier relevé reçu, en ms epoch. */
  updatedAt: number | null;
  /** "database" = vraies inscriptions ; "seed" = jeu d'exemple servi par l'API. */
  source: "database" | "seed" | null;
  error: boolean;
  refreshing: boolean;
  refresh: () => void;
};

/**
 * Source unique des équipes côté client : le classement du scoreboard ET la
 * recherche du hero lisent le même état.
 *
 * C'est ce qui fait qu'une équipe qui vient de s'inscrire apparaît dans les deux
 * au relevé suivant. Quand chaque composant interrogeait l'API pour son compte,
 * la recherche du hero restait sur le jeu d'exemple calculé au montage et
 * ignorait les inscriptions.
 *
 * Le polling est suspendu quand l'onglet passe en arrière-plan et relancé
 * immédiatement au retour : inutile de marteler l'API devant un onglet que
 * personne ne regarde, mais on ne veut pas revenir sur un relevé vieux de vingt
 * minutes.
 */
export function useCompetition(): CompetitionState {
  // Seedé avec le jeu d'exemple : le tableau est complet dès le premier paint,
  // jamais un squelette, puis l'API prend le relais.
  const [teams, setTeams] = useState<RankedTeam[]>(() => rankTeams(TEAMS));
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [source, setSource] = useState<"database" | "seed" | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/competition", { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTeams(data.teams);
      setUpdatedAt(new Date(data.updatedAt).getTime());
      setSource(data.source ?? null);
      setError(false);
    } catch (e) {
      // AbortError = démontage ou requête remplacée, pas une panne de l'API :
      // afficher « hors ligne » dans ce cas serait un faux négatif.
      if ((e as Error)?.name !== "AbortError") setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (!timer) timer = setInterval(() => void load(controller.signal), POLL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        void load(controller.signal);
        start();
      }
    };

    void load(controller.signal);
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const refresh = useCallback(() => void load(), [load]);

  return { teams, updatedAt, source, error, refreshing, refresh };
}
