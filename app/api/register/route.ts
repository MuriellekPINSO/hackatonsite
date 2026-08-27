import { NextResponse } from "next/server";
import { createTeam, DuplicateTeamError } from "@/lib/store";
import {
  hasErrors,
  normalizeRegistration,
  validateRegistration,
  type RegistrationInput,
} from "@/lib/registration";

export const dynamic = "force-dynamic";

/** Garde-fou de taille : un corps JSON d'inscription pèse ~1 ko. */
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  // Le client valide déjà pour afficher les erreurs sous les champs, mais un
  // POST peut arriver sans passer par le formulaire : on revalide ici, et c'est
  // cette validation-là qui fait foi.
  const input = body as RegistrationInput;
  if (!input || typeof input !== "object" || !Array.isArray(input.members)) {
    return NextResponse.json({ error: "Formulaire incomplet." }, { status: 400 });
  }

  const normalized = normalizeRegistration(input);
  const errors = validateRegistration(normalized);
  if (hasErrors(errors)) {
    return NextResponse.json({ error: "Formulaire invalide.", errors }, { status: 422 });
  }

  try {
    const team = await createTeam(normalized);
    return NextResponse.json({ team }, { status: 201 });
  } catch (e) {
    if (e instanceof DuplicateTeamError) {
      // 409 plutôt que 422 : la saisie est valide, c'est l'état du serveur qui
      // la refuse : le formulaire peut donc pointer le champ « nom d'équipe »
      // sans invalider le reste.
      return NextResponse.json(
        { error: e.message, errors: { team: "Ce nom d'équipe est déjà pris." } },
        { status: 409 }
      );
    }
    console.error("[register] échec de l'inscription", e);
    return NextResponse.json(
      { error: "L'inscription n'a pas pu être enregistrée. Réessaie dans un instant." },
      { status: 500 }
    );
  }
}
