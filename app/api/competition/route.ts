import { NextResponse } from "next/server";
import { CRITERIA, MAX_SCORE, TEAMS, rankTeams } from "@/lib/competition";
import { listTeams } from "@/lib/store";

// Source unique du classement ET de la recherche équipes/participants du hero.
//
// Les équipes viennent de la base (lib/store.ts) : une équipe qui s'inscrit via
// /api/register apparaît donc ici au relevé suivant (dans le scoreboard comme
// dans la recherche), sans autre branchement.
//
// SEED_WHEN_EMPTY sert la démo : tant qu'aucune inscription n'existe, la route
// renvoie le jeu d'exemple de lib/competition.ts pour que la page ne s'affiche
// pas vide. À passer à false (ou à supprimer TEAMS) avant l'ouverture des
// inscriptions, sinon les fausses équipes se mélangeraient aux vraies.
const SEED_WHEN_EMPTY = true;

// `force-dynamic` empêche Next de figer la réponse au build : sans ça le
// scoreboard « live » servirait un instantané du build à chaque requête.
export const dynamic = "force-dynamic";

export async function GET() {
  let source: "database" | "seed" = "database";
  let teams;

  try {
    const stored = await listTeams();
    if (stored.length === 0 && SEED_WHEN_EMPTY) {
      source = "seed";
      teams = rankTeams(TEAMS);
    } else {
      teams = rankTeams(stored);
    }
  } catch (e) {
    // Le classement est une page publique : si la base tombe pendant
    // l'événement, mieux vaut afficher le jeu d'exemple avec `source: "seed"`
    // (que le front peut signaler) qu'une page en erreur.
    console.error("[competition] lecture de la base impossible", e);
    source = "seed";
    teams = rankTeams(TEAMS);
  }

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      source,
      maxScore: MAX_SCORE,
      criteria: CRITERIA,
      teamCount: teams.length,
      participantCount: teams.reduce((sum, t) => sum + t.members.length, 0),
      teams,
    },
    // Le classement doit être frais à chaque appel : ni le navigateur ni le CDN
    // ne doivent servir un relevé périmé pendant les 30 h de compétition.
    { headers: { "Cache-Control": "no-store" } }
  );
}
