// Données de la compétition : équipes, participants et notes du live scoreboard.
//
// ⚠️ CONTENU DE DÉMONSTRATION. Les équipes ci-dessous sont des placeholders
// pour développer l'UI avant l'ouverture des inscriptions. Le seul point à
// remplacer le jour J est `TEAMS` (ou, mieux, la lecture faite dans
// app/api/competition/route.ts, qui est le point de branchement sur la vraie
// base). Tout le reste du fichier ne fait que dériver / trier / chercher.

/** Les quatre axes de notation, dans l'ordre où ils sont affichés. */
export const CRITERIA = [
  { key: "infra", label: "Déploiement", short: "Infra", max: 25 },
  { key: "api", label: "API & débit", short: "API", max: 25 },
  { key: "app", label: "Application", short: "App", max: 25 },
  { key: "demo", label: "Démo & pitch", short: "Démo", max: 25 },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

/** Score maximum atteignable, dérivé des critères (aujourd'hui 100). */
export const MAX_SCORE = CRITERIA.reduce((sum, c) => sum + c.max, 0);

/** « inscrite » = inscription reçue, pas encore notée par le jury. */
export type TeamStatus = "inscrite" | "en-lice" | "qualifiee" | "hors-course";

export type Member = {
  name: string;
  /** Rôle affiché sous le nom dans les résultats de recherche. */
  role: string;
};

export type Team = {
  id: string;
  name: string;
  city: string;
  tagline: string;
  status: TeamStatus;
  members: Member[];
  scores: Record<CriterionKey, number>;
  /** Rang au relevé précédent : sert à afficher la flèche de progression.
   *  `null` pour une équipe jamais classée (elle vient de s'inscrire) : elle ne
   *  peut ni monter ni descendre, on n'affiche donc aucune flèche. */
  previousRank: number | null;
};

export const TEAMS: Team[] = [
  {
    id: "wakandans-gpu",
    name: "Les Wakandans du GPU",
    city: "Cotonou",
    tagline: "vLLM + quantization AWQ sur 8×H200",
    status: "en-lice",
    members: [
      { name: "Aïcha Dossou", role: "Lead infra" },
      { name: "Rodrigue Ahouandjinou", role: "Backend / API" },
      { name: "Sèna Kpodar", role: "Frontend" },
      { name: "Mariam Bio Tchané", role: "Data & évaluation" },
    ],
    scores: { infra: 23, api: 22, app: 19, demo: 18 },
    previousRank: 2,
  },
  {
    id: "tokens-atlantique",
    name: "Tokens de l'Atlantique",
    city: "Abomey-Calavi",
    tagline: "Serving multi-modèles avec routage dynamique",
    status: "en-lice",
    members: [
      { name: "Jean-Marc Zinsou", role: "Lead infra" },
      { name: "Fatou Adjovi", role: "MLOps" },
      { name: "Blaise Sogbossi", role: "Fullstack" },
    ],
    scores: { infra: 22, api: 23, app: 20, demo: 16 },
    previousRank: 1,
  },
  {
    id: "kernel-panic-bj",
    name: "Kernel Panic BJ",
    city: "Porto-Novo",
    tagline: "Assistant juridique RAG en fon et en français",
    status: "en-lice",
    members: [
      { name: "Olivia Hounkpatin", role: "Product & démo" },
      { name: "Karim Baparapé", role: "Lead infra" },
      { name: "Sylvain Agbossou", role: "Recherche RAG" },
      { name: "Nadège Tossou", role: "Frontend" },
    ],
    scores: { infra: 20, api: 19, app: 24, demo: 21 },
    previousRank: 3,
  },
  {
    id: "sème-inference",
    name: "Sèmè Inference",
    city: "Sèmè-Podji",
    tagline: "Batching continu, 1 400 tokens/s soutenus",
    status: "en-lice",
    members: [
      { name: "Prince Gbaguidi", role: "Lead infra" },
      { name: "Chantal Amoussou", role: "Perf & benchmarks" },
      { name: "Ibrahim Yarou", role: "Backend / API" },
    ],
    scores: { infra: 24, api: 21, app: 15, demo: 17 },
    previousRank: 5,
  },
  {
    id: "moov-neurones",
    name: "Moov' Neurones",
    city: "Parakou",
    tagline: "Diagnostic agricole par photo, hors-ligne d'abord",
    status: "en-lice",
    members: [
      { name: "Espérance Kora", role: "Vision & modèles" },
      { name: "Damien Alladatin", role: "Lead infra" },
      { name: "Rachidou Bani", role: "Mobile" },
    ],
    scores: { infra: 18, api: 17, app: 22, demo: 20 },
    previousRank: 4,
  },
  {
    id: "lagune-labs",
    name: "Lagune Labs",
    city: "Cotonou",
    tagline: "Traduction fon ⇄ français temps réel",
    status: "en-lice",
    members: [
      { name: "Yasmine Lawani", role: "NLP" },
      { name: "Cyrille Dangbénon", role: "Lead infra" },
      { name: "Ange Sossou", role: "Frontend" },
      { name: "Kevin Houngbédji", role: "Évaluation" },
    ],
    scores: { infra: 19, api: 18, app: 20, demo: 19 },
    previousRank: 6,
  },
  {
    id: "h200-bandits",
    name: "H200 Bandits",
    city: "Bohicon",
    tagline: "Fine-tuning LoRA pendant le hackathon",
    status: "en-lice",
    members: [
      { name: "Sandra Akpo", role: "Lead ML" },
      { name: "Josué Tchibozo", role: "Infra" },
      { name: "Léa Vodounon", role: "Design & démo" },
    ],
    scores: { infra: 17, api: 16, app: 18, demo: 15 },
    previousRank: 7,
  },
  {
    id: "cluster-cotonou",
    name: "Cluster Cotonou",
    city: "Cotonou",
    tagline: "Observabilité et coût par million de tokens",
    status: "en-lice",
    members: [
      { name: "Firmin Ahoyo", role: "SRE" },
      { name: "Bénédicte Quenum", role: "Backend / API" },
      { name: "Toussaint Gandonou", role: "Fullstack" },
    ],
    scores: { infra: 16, api: 20, app: 14, demo: 14 },
    previousRank: 8,
  },
  {
    id: "octet-ouidah",
    name: "Octet Ouidah",
    city: "Ouidah",
    tagline: "Copilote pour les caisses de microfinance",
    status: "en-lice",
    members: [
      { name: "Ruth Adanlin", role: "Product" },
      { name: "Moïse Kpokpo", role: "Lead infra" },
      { name: "Anicet Djossou", role: "Backend" },
    ],
    scores: { infra: 15, api: 14, app: 17, demo: 16 },
    previousRank: 10,
  },
  {
    id: "flops-fifadji",
    name: "FLOPS Fifadji",
    city: "Cotonou",
    tagline: "Synthèse vocale pour les langues nationales",
    status: "en-lice",
    members: [
      { name: "Grace Ayélé", role: "Audio & TTS" },
      { name: "Wilfried Sohou", role: "Infra" },
      { name: "Nabil Ouorou", role: "Frontend" },
    ],
    scores: { infra: 14, api: 13, app: 16, demo: 18 },
    previousRank: 9,
  },
  {
    id: "batch-borgou",
    name: "Batch Borgou",
    city: "Parakou",
    tagline: "Support client automatisé pour PME",
    status: "en-lice",
    members: [
      { name: "Adamou Séro", role: "Lead infra" },
      { name: "Perpétue Boni", role: "Fullstack" },
      { name: "Hervé Nassara", role: "Démo" },
    ],
    scores: { infra: 13, api: 12, app: 13, demo: 12 },
    previousRank: 11,
  },
  {
    id: "prompt-pendjari",
    name: "Prompt Pendjari",
    city: "Natitingou",
    tagline: "Guide touristique multilingue embarqué",
    status: "en-lice",
    members: [
      { name: "Célestine Tamou", role: "Product & contenu" },
      { name: "Bachirou Yacoubou", role: "Infra" },
      { name: "Elodie Sambieni", role: "Mobile" },
    ],
    scores: { infra: 11, api: 11, app: 14, demo: 13 },
    previousRank: 12,
  },
];

export type RankedTeam = Team & {
  rank: number;
  total: number;
  /** previousRank − rank : positif = l'équipe remonte, négatif = elle descend,
   *  0 = inchangé ou jamais classée. */
  delta: number;
};

export function teamTotal(team: Team): number {
  return CRITERIA.reduce((sum, c) => sum + (team.scores[c.key] ?? 0), 0);
}

/**
 * Classement décroissant par score total. À score égal on départage sur le
 * déploiement puis l'API : l'ordre reste donc stable d'un relevé à l'autre au
 * lieu de sauter au gré de l'ordre du tableau source.
 */
export function rankTeams(teams: Team[] = TEAMS): RankedTeam[] {
  return [...teams]
    .map((team) => ({ ...team, total: teamTotal(team) }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.scores.infra - a.scores.infra ||
        b.scores.api - a.scores.api ||
        a.name.localeCompare(b.name, "fr")
    )
    .map((team, i) => ({
      ...team,
      rank: i + 1,
      // previousRank null = jamais classée : delta 0, pas de flèche. Sans ce
      // cas, une équipe qui vient de s'inscrire afficherait « ▼ 1 » : elle
      // aurait « perdu » une place qu'elle n'a jamais occupée.
      delta: team.previousRank == null ? 0 : team.previousRank - (i + 1),
    }));
}

export type SearchHit =
  | { kind: "team"; team: RankedTeam }
  | { kind: "member"; member: Member; team: RankedTeam };

/** Enlève accents et casse pour que « Aicha » trouve « Aïcha ». */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Recherche unifiée équipes + participants sur une liste déjà classée.
 * Les équipes passent avant les participants, et à l'intérieur de chaque
 * groupe un préfixe qui matche remonte avant une simple sous-chaîne.
 */
export function searchCompetition(query: string, teams: RankedTeam[], limit = 8): SearchHit[] {
  const q = fold(query);
  if (q.length < 1) return [];

  const scored: Array<{ hit: SearchHit; weight: number }> = [];

  for (const team of teams) {
    const haystacks = [team.name, team.city, team.tagline];
    const best = haystacks.reduce((acc, h) => {
      const folded = fold(h);
      if (folded.startsWith(q)) return Math.max(acc, 3);
      if (folded.includes(q)) return Math.max(acc, 2);
      return acc;
    }, 0);
    if (best > 0) scored.push({ hit: { kind: "team", team }, weight: 10 + best });

    for (const member of team.members) {
      const folded = fold(member.name);
      // Un match sur le prénom OU le nom de famille compte comme un préfixe.
      const isPrefix = folded.split(" ").some((word) => word.startsWith(q));
      if (isPrefix) scored.push({ hit: { kind: "member", member, team }, weight: 6 });
      else if (folded.includes(q) || fold(member.role).includes(q))
        scored.push({ hit: { kind: "member", member, team }, weight: 4 });
    }
  }

  return scored
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((s) => s.hit);
}

/** Initiales affichées dans les avatars (2 lettres max). */
export function initials(name: string): string {
  return name
    .split(/[\s'-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** Nombre total de participants, pour les compteurs du hero. */
export function participantCount(teams: Team[] = TEAMS): number {
  return teams.reduce((sum, t) => sum + t.members.length, 0);
}
