"use client";

// Porte d'entrée commune aux quatre espaces.
//
// On ne choisit pas son espace : on s'identifie, et le rôle décide où l'on
// atterrit. C'est ce que fait le /dashboard d'iSHEERO, et c'est le bon réflexe :
// laisser quelqu'un cliquer sur « Jury » pour découvrir qu'il n'y a pas droit
// est une frustration gratuite.
//
// Le lien magique plutôt qu'un mot de passe : sur un événement de 30 h, un mot
// de passe oublié à 3 h du matin est un incident de plus à traiter pour
// l'organisation, et personne ne veut gérer une réinitialisation cette nuit-là.

import { useState } from "react";
import Link from "next/link";
import Send from "reicon-react/icons/Send";
import TickCircle from "reicon-react/icons/TickCircle";
import { MAX_SCORE, participantCount } from "@/lib/competition";
import { EVENT, RANKED } from "@/lib/espaces-mock";

export default function EspaceLogin() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="dash-auth">
      <aside className="dash-auth-aside">
        <Link href="/" aria-label="Retour à la page publique">
          <img src="/logov1.svg" alt="" className="dash-auth-mark" />
        </Link>

        <div>
          <h1 className="dash-auth-claim">Espaces de la compétition</h1>
          <p className="dash-auth-brief">{EVENT.brief}</p>
        </div>

        <div className="dash-auth-facts">
          <div>
            <div className="dash-auth-fact-label">Durée</div>
            <div className="dash-auth-fact-value">{EVENT.totalHours} h</div>
          </div>
          <div>
            <div className="dash-auth-fact-label">Équipes</div>
            <div className="dash-auth-fact-value">{RANKED.length}</div>
          </div>
          <div>
            <div className="dash-auth-fact-label">Participants</div>
            <div className="dash-auth-fact-value">{participantCount()}</div>
          </div>
          <div>
            <div className="dash-auth-fact-label">Barème</div>
            <div className="dash-auth-fact-value">{MAX_SCORE} pts</div>
          </div>
        </div>
      </aside>

      <main className="dash-auth-panel">
        {sent ? (
          <div className="dash-auth-form">
            <span
              className="dash-avatar is-solid"
              aria-hidden="true"
              style={{ marginBottom: 20, background: "var(--ok-solid)", borderColor: "var(--ok-solid)" }}
            >
              <TickCircle size={17} />
            </span>
            <h2 className="dash-auth-title">Lien envoyé</h2>
            <p className="dash-auth-sub">
              Un lien de connexion part vers <b>{email}</b>. Il est valable 15 minutes et ne sert
              qu&apos;une fois.
            </p>
            <button
              type="button"
              className="dash-btn is-sm"
              style={{ marginTop: 22 }}
              onClick={() => setSent(false)}
            >
              Changer d&apos;adresse
            </button>
          </div>
        ) : (
          <form
            className="dash-auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <h2 className="dash-auth-title">Connexion</h2>
            <p className="dash-auth-sub">
              Entrez l&apos;adresse avec laquelle votre équipe s&apos;est inscrite. Vous recevez un
              lien, sans mot de passe à retenir.
            </p>

            <div className="dash-field" style={{ marginTop: 26 }}>
              <label className="dash-label" htmlFor="auth-email">
                Adresse e-mail
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                className="dash-input"
                placeholder="vous@equipe.bj"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="dash-btn is-primary"
              style={{ width: "100%", marginTop: 16 }}
            >
              <Send size={15} />
              Recevoir le lien
            </button>

            {/* Seules les adresses déjà connues peuvent entrer. Le dire ici évite
                à quelqu'un de s'acharner sur une adresse personnelle alors que
                son équipe s'est inscrite avec une autre. */}
            <p className="dash-auth-sub" style={{ fontSize: 12.5, marginTop: 16 }}>
              Seules les adresses déclarées à l&apos;inscription sont acceptées. Une erreur ?{" "}
              <Link href="/#contact" style={{ color: "var(--teal-text)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                écrivez à l&apos;organisation
              </Link>
              .
            </p>

            <div className="dash-auth-roles">
              {["Organisation", "Jury", "Mentor", "Participant"].map((r) => (
                <span className="dash-pill" key={r}>
                  {r}
                </span>
              ))}
            </div>
            <p className="dash-auth-sub" style={{ fontSize: 12, marginTop: 10 }}>
              Votre espace est choisi automatiquement selon votre rôle.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
