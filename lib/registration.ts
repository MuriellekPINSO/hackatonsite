// Formulaire d'inscription : types et validation PARTAGÉS entre le navigateur et
// la route API. Le client valide pour afficher les erreurs sous les champs, le
// serveur revalide parce qu'un POST peut arriver sans passer par le formulaire.

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 5;

export type MemberInput = { name: string; role: string };

export type RegistrationInput = {
  team: string;
  city: string;
  tagline: string;
  contact: string;
  email: string;
  phone: string;
  members: MemberInput[];
};

export const EMPTY_REGISTRATION: RegistrationInput = {
  team: "",
  city: "",
  tagline: "",
  contact: "",
  email: "",
  phone: "",
  members: [
    { name: "", role: "" },
    { name: "", role: "" },
  ],
};

/** Erreurs par champ. `members` est indexé par position dans le tableau. */
export type RegistrationErrors = {
  team?: string;
  city?: string;
  tagline?: string;
  contact?: string;
  email?: string;
  phone?: string;
  members?: Record<number, string>;
  form?: string;
};

// Volontairement permissif : le but est d'attraper les fautes de frappe
// évidentes, pas de rejeter une adresse exotique mais valide.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Numéros béninois et internationaux : chiffres, espaces, points, tirets,
// parenthèses, plus éventuel indicatif +.
const PHONE_RE = /^\+?[\d\s.()-]{8,20}$/;

export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const team = input.team.trim();
  const contact = input.contact.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();

  if (team.length < 2) errors.team = "Donne un nom d'équipe (2 caractères minimum).";
  else if (team.length > 60) errors.team = "60 caractères maximum.";

  if (contact.length < 2) errors.contact = "Indique le contact principal.";
  else if (contact.length > 80) errors.contact = "80 caractères maximum.";

  if (!EMAIL_RE.test(email)) errors.email = "Cette adresse email n'a pas l'air valide.";
  if (!PHONE_RE.test(phone)) errors.phone = "Numéro invalide : 8 chiffres minimum, indicatif accepté.";

  if (input.city.trim().length > 80) errors.city = "80 caractères maximum.";
  if (input.tagline.trim().length > 120) errors.tagline = "120 caractères maximum.";

  // Un membre « rempli » est un membre qui a un nom : les lignes laissées
  // entièrement vides sont ignorées, pas signalées en erreur.
  const named = input.members.filter((m) => m.name.trim().length > 0);
  if (named.length < MIN_MEMBERS) {
    errors.form = `Il faut au moins ${MIN_MEMBERS} membres nommés dans l'équipe.`;
  }
  if (input.members.length > MAX_MEMBERS) {
    errors.form = `Une équipe compte ${MAX_MEMBERS} membres au maximum.`;
  }

  const memberErrors: Record<number, string> = {};
  input.members.forEach((m, i) => {
    const name = m.name.trim();
    if (name.length > 0 && name.length < 2) memberErrors[i] = "Nom trop court.";
    else if (name.length > 80) memberErrors[i] = "80 caractères maximum.";
  });
  if (Object.keys(memberErrors).length > 0) errors.members = memberErrors;

  return errors;
}

export function hasErrors(errors: RegistrationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Slug d'équipe utilisé comme identifiant en base et comme ancre dans le
 * scoreboard : accents dépliés, tout ce qui n'est pas alphanumérique replié en
 * tirets. « Les Wakandans du GPU » → « les-wakandans-du-gpu ».
 */
export function teamSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "equipe"
  );
}

/** Nettoie l'entrée avant écriture : trim partout, membres vides écartés. */
export function normalizeRegistration(input: RegistrationInput): RegistrationInput {
  return {
    team: input.team.trim(),
    city: input.city.trim(),
    tagline: input.tagline.trim(),
    contact: input.contact.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    members: input.members
      .filter((m) => m.name.trim().length > 0)
      .slice(0, MAX_MEMBERS)
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() })),
  };
}
