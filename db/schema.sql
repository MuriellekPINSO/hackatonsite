-- Schéma du Tamebi Challenge 2026.
--
-- À appliquer une fois sur la base (Supabase, Neon, RDS… n'importe quel
-- PostgreSQL) :
--     psql "$DATABASE_URL" -f db/schema.sql
--
-- Une équipe = une ligne dans `teams`, ses participants dans `members`, ses
-- notes dans `scores`. L'inscription depuis le site crée la team + ses members ;
-- le jury ne touche que `scores` pendant les 30 h.

CREATE TABLE IF NOT EXISTS teams (
  -- Slug lisible dérivé du nom, utilisé comme ancre dans le scoreboard et dans
  -- l'URL de partage, d'où un texte plutôt qu'un entier auto-incrémenté.
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  city          TEXT NOT NULL DEFAULT '',
  tagline       TEXT NOT NULL DEFAULT '',
  contact_name  TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  -- 'inscrite' à la création, puis 'en-lice' quand l'organisation valide la
  -- place, 'hors-course' en cas de désistement.
  status        TEXT NOT NULL DEFAULT 'inscrite',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deux équipes ne peuvent pas porter le même nom, à la casse et aux espaces
-- près : c'est la contrainte qui rend le POST /api/register idempotent côté
-- base, même si deux personnes de la même équipe s'inscrivent en même temps.
CREATE UNIQUE INDEX IF NOT EXISTS teams_name_key ON teams (lower(btrim(name)));

CREATE TABLE IF NOT EXISTS members (
  id      BIGSERIAL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  role    TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS members_team_id_idx ON members (team_id);

CREATE TABLE IF NOT EXISTS scores (
  team_id       TEXT PRIMARY KEY REFERENCES teams (id) ON DELETE CASCADE,
  infra         INTEGER NOT NULL DEFAULT 0,
  api           INTEGER NOT NULL DEFAULT 0,
  app           INTEGER NOT NULL DEFAULT 0,
  demo          INTEGER NOT NULL DEFAULT 0,
  -- Rang au relevé précédent : c'est lui qui alimente la flèche ▲/▼ du
  -- scoreboard. À mettre à jour en même temps que les notes.
  previous_rank INTEGER,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scores_range CHECK (
    infra BETWEEN 0 AND 25 AND api BETWEEN 0 AND 25 AND
    app   BETWEEN 0 AND 25 AND demo BETWEEN 0 AND 25
  )
);
