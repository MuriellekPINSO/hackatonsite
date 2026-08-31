// Jeu de données des quatre espaces privés (organisation, jury, mentor, équipe).
//
// ⚠️ CONTENU DE DÉMONSTRATION, comme TEAMS dans lib/competition.ts. Ce fichier
// n'existe que pour dérouler les écrans avant que la base et l'authentification
// soient branchées. Le jour du branchement, chaque constante ci-dessous devient
// une lecture : les composants qui les consomment ne changent pas de forme.
//
// Les équipes, elles, ne sont PAS redéclarées ici : elles viennent de
// lib/competition.ts, donc les espaces privés et le scoreboard public parlent
// des mêmes équipes et des mêmes notes.

import { CRITERIA, rankTeams, type CriterionKey, type RankedTeam } from "@/lib/competition";

/* ---------------------------------------------------------------- ÉVÉNEMENT */

/** Durée totale de la compétition et temps déjà écoulé, en heures.
 *
 *  Valeur figée plutôt que dérivée de Date.now() : le rendu serveur et le
 *  rendu client doivent produire le même HTML, et une horloge vivante se
 *  branchera dans un effet le moment venu (cf. Scoreboard, qui fait déjà ça). */
export const EVENT = {
  name: "Tamebi Challenge 2026",
  totalHours: 30,
  elapsedHours: 12.4,
  /** Ce que toutes les équipes doivent livrer : le sujet est commun. */
  brief: "Servir un LLM open-weights sur GPU, exposer une API, livrer l'app au-dessus.",
} as const;

export function remainingLabel(): string {
  const left = EVENT.totalHours - EVENT.elapsedHours;
  const h = Math.floor(left);
  const m = Math.round((left - h) * 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export const EVENT_PROGRESS = Math.round((EVENT.elapsedHours / EVENT.totalHours) * 100);

/* ------------------------------------------------------------- INTERRUPTEURS */

/** Les bascules que l'organisation actionne en direct.
 *
 *  Elles vivent en base plutôt qu'en dur dans le code : pendant les 30 h,
 *  ouvrir la notation ou révéler le classement ne doit pas demander un
 *  redéploiement. C'est l'idée la plus directement volée à la plateforme
 *  iSHEERO, et la mieux adaptée à un événement qui se pilote à la minute. */
export type ToggleKey =
  | "registration_open"
  | "submissions_locked"
  | "scoring_open"
  | "rankings_public";

export const TOGGLES: {
  key: ToggleKey;
  title: string;
  desc: string;
  value: boolean;
  /** Conséquence visible immédiatement, affichée sous le libellé. */
  effect: string;
}[] = [
  {
    key: "registration_open",
    title: "Inscriptions ouvertes",
    desc: "Le formulaire de la page d'accueil accepte de nouvelles équipes.",
    value: false,
    effect: "Fermées depuis T+0 h",
  },
  {
    key: "submissions_locked",
    title: "Livrables verrouillés",
    desc: "Les équipes ne peuvent plus modifier leurs liens (dépôt, déploiement, endpoint).",
    value: false,
    effect: "À activer à T+28 h",
  },
  {
    key: "scoring_open",
    title: "Notation jury ouverte",
    desc: "Les jurés peuvent saisir et soumettre leurs notes.",
    value: true,
    effect: "Ouverte depuis T+11 h",
  },
  {
    key: "rankings_public",
    title: "Classement public",
    desc: "Le scoreboard de la page d'accueil affiche les notes réelles.",
    value: true,
    effect: "Visible par tous",
  },
];

/* -------------------------------------------------------------------- JURY */

/** Aide de notation, un texte par critère.
 *
 *  Le sujet étant commun à toutes les équipes, deux jurés qui n'ont pas la
 *  même lecture d'« API & débit » produisent un classement bruité. Ces phrases
 *  sont donc affichées sous chaque curseur, pas rangées dans un règlement PDF. */
export const CRITERION_HELP: Record<CriterionKey, string> = {
  infra: "Le modèle tourne-t-il vraiment sur GPU ? Quantization, batching, reprise après crash.",
  api: "Débit en tokens/s sous charge, latence au premier token, tenue du service pendant la démo.",
  app: "L'application au-dessus de l'API : utile, finie, utilisable par quelqu'un d'extérieur.",
  demo: "Clarté du propos, choix techniques assumés, démo qui tourne en direct sans filet.",
};

export type ScoreDraft = Record<CriterionKey, number | null>;

export const EMPTY_DRAFT: ScoreDraft = { infra: null, api: null, app: null, demo: null };

export type JuryEntry = {
  teamId: string;
  state: "todo" | "draft" | "submitted";
  scores: ScoreDraft;
  comment: string;
};

/** État de notation du juré connecté, une entrée par équipe déjà ouverte. */
export const MY_JURY_ENTRIES: JuryEntry[] = [
  {
    teamId: "wakandans-gpu",
    state: "submitted",
    scores: { infra: 23, api: 22, app: 19, demo: 18 },
    comment: "Quantization AWQ maîtrisée, le débit tient sous charge. L'app reste un peu brute.",
  },
  {
    teamId: "sème-inference",
    state: "draft",
    scores: { infra: 20, api: 18, app: null, demo: null },
    comment: "",
  },
  {
    teamId: "tokens-atlantique",
    state: "submitted",
    scores: { infra: 18, api: 21, app: 20, demo: 17 },
    comment: "Meilleure latence au premier token de la salle.",
  },
];

export const JURY_ME = { name: "Danielle Kpinsô", role: "Jury technique" };

/* ------------------------------------------------------------------ MENTOR */

export type HelpRequest = {
  id: string;
  teamId: string;
  subject: string;
  detail: string;
  /** Depuis combien de minutes la demande attend. */
  waitingMin: number;
  severity: "bloquant" | "gênant" | "question";
  state: "en-attente" | "pris-en-charge" | "resolu";
  takenBy?: string;
};

export const HELP_REQUESTS: HelpRequest[] = [
  {
    id: "r-01",
    teamId: "sème-inference",
    subject: "OOM au chargement du modèle sur 2 GPU",
    detail: "CUDA out of memory dès le shard 3. On a tenté --tensor-parallel-size 2 sans succès.",
    waitingMin: 4,
    severity: "bloquant",
    state: "en-attente",
  },
  {
    id: "r-02",
    teamId: "tokens-atlantique",
    subject: "Latence qui explose au-delà de 30 requêtes simultanées",
    detail: "Le premier token passe de 180 ms à 4 s. On soupçonne le batching.",
    waitingMin: 11,
    severity: "gênant",
    state: "en-attente",
  },
  {
    id: "r-03",
    teamId: "cluster-cotonou",
    subject: "Quel format de réponse pour l'API ?",
    detail: "On hésite entre du SSE et un JSON complet. Le règlement impose-t-il quelque chose ?",
    waitingMin: 23,
    severity: "question",
    state: "pris-en-charge",
    takenBy: "Yoann O.",
  },
  {
    id: "r-04",
    teamId: "wakandans-gpu",
    subject: "Certificat TLS refusé par le proxy",
    detail: "Résolu : le domaine n'était pas encore propagé, il fallait attendre.",
    waitingMin: 47,
    severity: "gênant",
    state: "resolu",
    takenBy: "Danielle K.",
  },
];

/** Blocages déjà vus plusieurs fois.
 *
 *  Spécifique à un hackathon à sujet unique : quand quarante équipes déploient
 *  le même modèle sur le même matériel, elles butent sur les mêmes murs. Ce
 *  panneau évite au mentor de réexpliquer douze fois la même chose, et c'est
 *  exactement ce que la plateforme iSHEERO n'avait pas à gérer. */
export const KNOWN_BLOCKERS: { title: string; hint: string; hits: number }[] = [
  {
    title: "CUDA out of memory au chargement",
    hint: "Baisser --gpu-memory-utilization à 0.85 avant de toucher au tensor parallel.",
    hits: 9,
  },
  {
    title: "Débit qui s'effondre sous charge",
    hint: "Le batching continu n'est pas activé par défaut selon la version du serveur.",
    hits: 6,
  },
  {
    title: "Port non exposé depuis l'extérieur",
    hint: "Le service écoute sur 127.0.0.1 : il faut bind 0.0.0.0 pour que le jury teste.",
    hits: 5,
  },
];

export const MENTOR_ME = { name: "Yoann Ozohoun", role: "Mentor infra" };

/* ------------------------------------------------------------------ ÉQUIPE */

/** Équipe du participant connecté. */
export const MY_TEAM_ID = "sème-inference";

export const PARTICIPANT_ME = { name: "Sèna Kpodar", role: "Frontend" };

export type Deliverable = {
  key: string;
  title: string;
  desc: string;
  done: boolean;
  value?: string;
  /** Le jury vérifie ce livrable pour ce critère : le lien est explicite. */
  criterion: CriterionKey;
};

export const MY_DELIVERABLES: Deliverable[] = [
  {
    key: "repo",
    title: "Dépôt public",
    desc: "Le jury doit pouvoir cloner et relancer votre pile depuis le README.",
    done: true,
    value: "github.com/seme-inference/serve",
    criterion: "infra",
  },
  {
    key: "deploy",
    title: "Service déployé",
    desc: "Une URL jointe depuis l'extérieur, qui répond pendant toute la notation.",
    done: true,
    value: "https://pni-serve.tamebi.dev",
    criterion: "infra",
  },
  {
    key: "endpoint",
    title: "Endpoint d'inférence",
    desc: "L'adresse exacte que le jury appellera pour mesurer votre débit.",
    done: true,
    value: "POST /v1/chat/completions",
    criterion: "api",
  },
  {
    key: "bench",
    title: "Relevé de charge",
    desc: "Tokens/s et latence au premier token, mesurés par vos soins.",
    done: false,
    criterion: "api",
  },
  {
    key: "app",
    title: "Application",
    desc: "L'interface au-dessus de l'API, utilisable sans vous expliquer.",
    done: true,
    value: "https://pni.tamebi.dev",
    criterion: "app",
  },
  {
    key: "pitch",
    title: "Support de démo",
    desc: "5 minutes, en direct. Aucun enregistrement accepté.",
    done: false,
    criterion: "demo",
  },
];

export const ANNOUNCEMENTS: { time: string; title: string; body: string; pinned?: boolean }[] = [
  {
    time: "T+11:00",
    title: "La notation est ouverte",
    body: "Les jurés passent sur les stands. Gardez votre service en ligne jusqu'à la fin.",
    pinned: true,
  },
  {
    time: "T+08:30",
    title: "Quota GPU relevé",
    body: "Chaque équipe passe de 2 à 4 GPU. Relancez votre déploiement pour en profiter.",
  },
  {
    time: "T+02:00",
    title: "Le sujet complet est en ligne",
    body: "Barème détaillé et jeu de test de référence dans le dépôt de l'organisation.",
  },
];

/* -------------------------------------------------------------- ORGANISATION */

export const ACTIVITY: { time: string; text: string; tone?: "teal" | "amber" | "green" }[] = [
  { time: "T+12:22", text: "**Tokens de l'Atlantique** a mis à jour son endpoint d'inférence." },
  { time: "T+12:14", text: "**Danielle K.** a soumis sa note pour **Wakandans du GPU**.", tone: "green" },
  { time: "T+12:09", text: "**Sèmè Inference** a ouvert une demande d'aide bloquante.", tone: "amber" },
  { time: "T+11:58", text: "**Yoann O.** a pris en charge la demande de **Cluster Cotonou**." },
  { time: "T+11:02", text: "La notation jury a été ouverte par l'organisation.", tone: "teal" },
  { time: "T+10:47", text: "**Cluster Cotonou** a déployé son service." },
];

export const ORG_ME = { name: "Organisation", role: "Administration" };

/* ------------------------------------------------------------------ HELPERS */

/** Classement calculé une fois, partagé par les quatre espaces. */
export const RANKED: RankedTeam[] = rankTeams();

export function teamById(id: string): RankedTeam | undefined {
  return RANKED.find((t) => t.id === id);
}

/** Total d'un brouillon de notation, ou null tant qu'un critère manque.
 *
 *  Les quatre critères pèsent 25 points chacun, donc la somme brute EST la
 *  note sur 100 : pas de pondération à appliquer, contrairement au barème
 *  25/25/20/15/15 d'iSHEERO qui obligeait à diviser (et qu'ils avaient
 *  d'ailleurs divisé par 20 au lieu de 100 pendant un temps). */
export function draftTotal(scores: ScoreDraft): number | null {
  let sum = 0;
  for (const c of CRITERIA) {
    const v = scores[c.key];
    if (v == null) return null;
    sum += v;
  }
  return sum;
}

export function severityTone(s: HelpRequest["severity"]): "red" | "amber" | "neutral" {
  if (s === "bloquant") return "red";
  if (s === "gênant") return "amber";
  return "neutral";
}

export function waitLabel(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
