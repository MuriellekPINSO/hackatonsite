import { redirect } from "next/navigation";

// Aiguillage. Aujourd'hui il envoie sur l'espace organisation, faute de
// session : c'est celui qui donne la vue la plus large pour juger les
// maquettes. Le jour où l'authentification arrive, cette page devient
// l'équivalent du /dashboard d'iSHEERO — elle lit le rôle et redirige :
//
//   admin → /espace/admin · jury → /espace/jury
//   mentor → /espace/mentor · participant → /espace/equipe
//
// Un seul endroit à changer, et les quatre espaces n'ont pas à connaître les
// rôles des autres.
export default function EspaceIndex() {
  redirect("/espace/admin");
}
