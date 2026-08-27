// Accès aux données de la compétition : la seule couche qui parle à la base.
//
// Deux implémentations derrière la même interface :
//
//   • PostgreSQL (`pg`) dès que DATABASE_URL est défini. C'est le mode de
//     production : Supabase, Neon, RDS ou tout autre PostgreSQL. Appliquer
//     db/schema.sql une fois avant le premier lancement.
//
//   • Un fichier JSON local (.data/registrations.json) quand DATABASE_URL est
//     absent EN DÉVELOPPEMENT, pour pouvoir dérouler le formulaire de bout en
//     bout sans base à installer.
//
// En production sans DATABASE_URL, le module lève une erreur au lieu de basculer
// sur le fichier : sur un hébergeur serverless le disque est éphémère, donc
// écrire là voudrait dire accepter une inscription puis la perdre en silence.
// Mieux vaut un 500 visible qu'une équipe qui croit être inscrite et ne l'est
// pas.

import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import {
  MAX_SCORE,
  type CriterionKey,
  type Team,
  type TeamStatus,
} from "@/lib/competition";
import { teamSlug, type RegistrationInput } from "@/lib/registration";

export type StoredTeam = Team & {
  contact: { name: string; email: string; phone: string };
  createdAt: string;
};

export type StoreMode = "postgres" | "file";

const DATABASE_URL = process.env.DATABASE_URL;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function storeMode(): StoreMode {
  if (DATABASE_URL) return "postgres";
  if (IS_PRODUCTION) {
    throw new Error(
      "DATABASE_URL manquant. Le repli sur fichier est réservé au développement : " +
        "en production les inscriptions seraient perdues. Définis DATABASE_URL et " +
        "applique db/schema.sql."
    );
  }
  return "file";
}

/* ------------------------------------------------------------------ Postgres */

// Le pool est mémorisé sur globalThis : en dev, chaque rechargement à chaud
// réévalue le module, et un `new Pool()` par rechargement finirait par saturer
// le nombre de connexions autorisées par la base.
const globalForPool = globalThis as unknown as { tamebiPool?: Pool };

function pool(): Pool {
  if (!globalForPool.tamebiPool) {
    globalForPool.tamebiPool = new Pool({
      connectionString: DATABASE_URL,
      // Supabase, Neon & co. imposent TLS mais présentent une chaîne que Node ne
      // valide pas d'office ; le paramètre sslmode de l'URL reste prioritaire.
      ssl: DATABASE_URL?.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForPool.tamebiPool;
}

type TeamRow = {
  id: string;
  name: string;
  city: string;
  tagline: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: Date | string;
  infra: number | null;
  api: number | null;
  app: number | null;
  demo: number | null;
  previous_rank: number | null;
  members: Array<{ name: string; role: string }> | null;
};

const SELECT_TEAMS = `
  SELECT t.id, t.name, t.city, t.tagline, t.status,
         t.contact_name, t.contact_email, t.contact_phone, t.created_at,
         s.infra, s.api, s.app, s.demo, s.previous_rank,
         COALESCE(
           (SELECT json_agg(json_build_object('name', m.name, 'role', m.role) ORDER BY m.id)
              FROM members m WHERE m.team_id = t.id),
           '[]'::json
         ) AS members
    FROM teams t
    LEFT JOIN scores s ON s.team_id = t.id
   ORDER BY t.created_at
`;

/** Même projection que SELECT_TEAMS, filtrée sur une équipe : dériver la
 *  requête au lieu de la recopier évite que les deux listes de colonnes
 *  divergent le jour où l'on en ajoute une. */
const SELECT_ONE_TEAM = SELECT_TEAMS.replace("ORDER BY t.created_at", "WHERE t.id = $1");

function rowToTeam(row: TeamRow): StoredTeam {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    tagline: row.tagline,
    status: (row.status as TeamStatus) ?? "inscrite",
    members: row.members ?? [],
    scores: {
      infra: row.infra ?? 0,
      api: row.api ?? 0,
      app: row.app ?? 0,
      demo: row.demo ?? 0,
    },
    // null = jamais classée (rankTeams n'affichera alors aucune flèche).
    previousRank: row.previous_rank,
    contact: { name: row.contact_name, email: row.contact_email, phone: row.contact_phone },
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/* ---------------------------------------------------------------------- File */

const FILE_PATH = path.join(process.cwd(), ".data", "registrations.json");

async function readFileTeams(): Promise<StoredTeam[]> {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, "utf8")) as StoredTeam[];
  } catch (e) {
    // Premier lancement : le fichier n'existe pas encore, ce n'est pas une
    // panne. Toute autre erreur (JSON corrompu, droits) doit remonter.
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeFileTeams(teams: StoredTeam[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(teams, null, 2), "utf8");
}

/* ------------------------------------------------------------------- Public */

/** Toutes les équipes enregistrées, sans classement (rankTeams s'en charge). */
export async function listTeams(): Promise<StoredTeam[]> {
  if (storeMode() === "postgres") {
    const { rows } = await pool().query<TeamRow>(SELECT_TEAMS);
    return rows.map(rowToTeam);
  }
  return readFileTeams();
}

export class DuplicateTeamError extends Error {
  constructor(public teamName: string) {
    super(`Une équipe nommée « ${teamName} » est déjà inscrite.`);
    this.name = "DuplicateTeamError";
  }
}

/**
 * Enregistre une équipe et ses membres, puis renvoie la ligne créée.
 *
 * L'entrée doit déjà être passée par normalizeRegistration/validateRegistration.
 * Lève DuplicateTeamError si le nom est pris : la contrainte unique en base
 * (teams_name_key) est l'arbitre, pas un SELECT préalable, sinon deux
 * inscriptions simultanées de la même équipe passeraient toutes les deux.
 */
export async function createTeam(input: RegistrationInput): Promise<StoredTeam> {
  const id = teamSlug(input.team);
  const now = new Date().toISOString();

  if (storeMode() === "postgres") {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      let inserted;
      try {
        inserted = await client.query<TeamRow>(
          `INSERT INTO teams (id, name, city, tagline, contact_name, contact_email, contact_phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [id, input.team, input.city, input.tagline, input.contact, input.email, input.phone]
        );
      } catch (e) {
        // 23505 = unique_violation : le nom d'équipe, ou le slug en clé primaire.
        if ((e as { code?: string }).code === "23505") throw new DuplicateTeamError(input.team);
        throw e;
      }
      const teamId = inserted.rows[0].id;

      for (const m of input.members) {
        await client.query(`INSERT INTO members (team_id, name, role) VALUES ($1, $2, $3)`, [
          teamId,
          m.name,
          m.role,
        ]);
      }
      // Ligne de notes à zéro dès l'inscription : l'équipe apparaît ainsi dans
      // le scoreboard avant même d'être notée, au lieu de surgir au premier
      // point marqué.
      await client.query(`INSERT INTO scores (team_id) VALUES ($1)`, [teamId]);
      await client.query("COMMIT");

      const { rows } = await client.query<TeamRow>(SELECT_ONE_TEAM, [teamId]);
      if (rows.length === 0) throw new Error("Équipe créée mais introuvable à la relecture");
      return rowToTeam(rows[0]);
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  const teams = await readFileTeams();
  const taken = teams.some(
    (t) => t.name.trim().toLowerCase() === input.team.trim().toLowerCase() || t.id === id
  );
  if (taken) throw new DuplicateTeamError(input.team);

  const created: StoredTeam = {
    id,
    name: input.team,
    city: input.city,
    tagline: input.tagline,
    status: "inscrite",
    members: input.members,
    scores: { infra: 0, api: 0, app: 0, demo: 0 },
    previousRank: null,
    contact: { name: input.contact, email: input.email, phone: input.phone },
    createdAt: now,
  };
  await writeFileTeams([...teams, created]);
  return created;
}

/** Garde-fou : aucune note ne doit dépasser le barème. */
export function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export const SCORE_KEYS: CriterionKey[] = ["infra", "api", "app", "demo"];
export { MAX_SCORE };
