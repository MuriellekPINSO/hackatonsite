"use client";

// Espace ÉQUIPE : le participant.
//
// Chez iSHEERO, la page d'équipe est un dossier : problème adressé, solution,
// insights, disclosure IA. Ça a du sens quand chaque équipe traite un sujet
// différent et doit d'abord expliquer lequel.
//
// Ici le sujet est commun, donc il n'y a rien à expliquer : ce qui départage
// les équipes, c'est ce qui tourne. La pièce centrale de cet écran est donc une
// checklist de livrables, chaque ligne rattachée au critère que le jury notera
// grâce à elle. Une équipe doit pouvoir lire, d'un coup d'œil, ce qui lui coûte
// des points en ce moment.

import { useState } from "react";
import { toast } from "sonner";
import Box from "reicon-react/icons/Box";
import Trophy from "reicon-react/icons/Trophy";
import Lifebuoy from "reicon-react/icons/Lifebuoy";
import People from "reicon-react/icons/People";
import Notification from "reicon-react/icons/Notification";
import { CRITERIA, MAX_SCORE, initials, type Member } from "@/lib/competition";
import {
  ANNOUNCEMENTS,
  HELP_REQUESTS,
  MY_DELIVERABLES,
  MY_TEAM_ID,
  PARTICIPANT_ME,
  RANKED,
  teamById,
  waitLabel,
} from "@/lib/espaces-mock";
import { DashShell, type DashSection } from "@/components/espaces/dash-shell";
import { Avatar, Bar, Pill, SectionHead } from "@/components/espaces/dash-ui";

const CRITERION_LABEL = Object.fromEntries(CRITERIA.map((c) => [c.key, c.label]));

export default function EquipeEspace() {
  const team = teamById(MY_TEAM_ID)!;
  const myRequests = HELP_REQUESTS.filter((r) => r.teamId === MY_TEAM_ID);
  const [askOpen, setAskOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>(team.members);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  // Le bouton vit dans l'en-tête, en haut de page, mais le formulaire qu'il
  // révèle est dans la section « Aide » plus bas : sans ce scroll, ouvrir le
  // formulaire ne change rien à l'écran visible et donne l'impression que le
  // bouton ne fait rien.
  function openAsk() {
    setAskOpen(true);
    document.getElementById("aide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addMember() {
    const name = newName.trim();
    if (!name) return;
    setMembers((prev) => [...prev, { name, role: newRole.trim() || "Membre" }]);
    setNewName("");
    setNewRole("");
    setAddMemberOpen(false);
    toast.success("Membre ajouté", { description: `${name} fait maintenant partie de l'équipe.` });
  }

  const done = MY_DELIVERABLES.filter((d) => d.done).length;
  const missing = MY_DELIVERABLES.filter((d) => !d.done);

  const sections: DashSection[] = [
    { id: "equipe", label: "Mon équipe", icon: Trophy },
    {
      id: "livrables",
      label: "Livrables",
      icon: Box,
      count: missing.length,
      hot: missing.length > 0,
    },
    { id: "aide", label: "Aide", icon: Lifebuoy, count: myRequests.filter((r) => r.state !== "resolu").length },
    { id: "membres", label: "Membres", icon: People },
    { id: "annonces", label: "Annonces", icon: Notification },
  ];

  return (
    <DashShell role="equipe" who={PARTICIPANT_ME} title={team.name} sections={sections}>
      <div className="dash-page-head">
        <div>
          <h1 className="dash-page-title">{team.name}</h1>
          <p className="dash-page-sub">
            {team.tagline} · {team.city}
          </p>
        </div>
        <button type="button" className="dash-btn is-accent" onClick={openAsk}>
          <Lifebuoy size={15} />
          Demander de l&apos;aide
        </button>
      </div>

      {/* ------------------------------------------------------ 01 ÉQUIPE */}
      <section id="equipe" className="dash-section">
        <SectionHead num="01" title="Où vous en êtes" />
        <div className="dash-grid dash-grid-2">
          <div className="dash-card is-dark">
            <div className="dash-stat-label">Rang actuel</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 9 }}>
              <span className="dash-stat-value" style={{ marginTop: 0 }}>
                {team.rank}
                <span className="dash-stat-unit">/ {RANKED.length}</span>
              </span>
              {team.delta !== 0 && (
                <span
                  className="dash-mono"
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: team.delta > 0 ? "#6fe0a0" : "#e89b86",
                  }}
                >
                  {team.delta > 0 ? "▲" : "▼"} {Math.abs(team.delta)}
                </span>
              )}
            </div>
            <div style={{ marginTop: 18 }}>
              <Bar value={team.total} max={MAX_SCORE} onDark label={`Score de ${team.name}`} />
              <div
                className="dash-mono"
                style={{
                  fontSize: 11.5,
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  color: "rgba(247,247,249,.62)",
                }}
              >
                <span>
                  {team.total} / {MAX_SCORE} points
                </span>
                <span>{done} livrables sur {MY_DELIVERABLES.length}</span>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-stat-label">Vos notes par critère</div>
            <ul style={{ listStyle: "none", marginTop: 16, display: "grid", gap: 13 }}>
              {CRITERIA.map((c) => (
                <li key={c.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 13.5,
                      marginBottom: 6,
                    }}
                  >
                    <b style={{ fontWeight: 700 }}>{c.label}</b>
                    <span className="dash-mono">
                      {team.scores[c.key]}
                      <span className="dash-muted"> / {c.max}</span>
                    </span>
                  </div>
                  <Bar value={team.scores[c.key]} max={c.max} label={`${c.label}`} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- 02 LIVRABLES */}
      <section id="livrables" className="dash-section">
        <SectionHead
          num="02"
          title="Livrables"
          sub="Le sujet est le même pour toutes les équipes : c'est ce que le jury peut ouvrir, appeler et lancer qui vous départage."
          aside={
            missing.length > 0 ? (
              <Pill tone="amber" dot>
                {missing.length} manquant{missing.length > 1 ? "s" : ""}
              </Pill>
            ) : (
              <Pill tone="green" dot>
                Tout est livré
              </Pill>
            )
          }
        />
        <div className="dash-card">
          {MY_DELIVERABLES.map((d) => (
            <div className="dash-check" data-done={d.done} key={d.key}>
              <span className="dash-check-mark" aria-hidden="true">
                {d.done ? "✓" : ""}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dash-check-title">
                  {d.title}
                  {/* Le rattachement au critère est explicite : une équipe doit
                      savoir quel point elle perd en laissant une ligne vide. */}
                  <Pill tone={d.done ? "neutral" : "amber"}>
                    Noté sur « {CRITERION_LABEL[d.criterion]} »
                  </Pill>
                </div>
                <p className="dash-check-desc">{d.desc}</p>
                {d.value && (
                  <p style={{ marginTop: 7 }}>
                    <span className="dash-check-link">{d.value}</span>
                  </p>
                )}
              </div>
              {!d.done && (
                <button type="button" className="dash-btn is-sm">
                  Ajouter
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- 03 AIDE */}
      <section id="aide" className="dash-section">
        <SectionHead
          num="03"
          title="Aide"
          sub="Un mentor prend la demande depuis son espace. Les demandes bloquantes passent devant les questions."
        />

        {askOpen && (
          <div className="dash-card" style={{ marginBottom: 16 }}>
            <div className="dash-grid dash-grid-2" style={{ marginBottom: 14 }}>
              <div className="dash-field">
                <label className="dash-label" htmlFor="ask-subject">
                  Sujet
                </label>
                <input
                  id="ask-subject"
                  className="dash-input"
                  placeholder="OOM au chargement du modèle"
                />
              </div>
              <div className="dash-field">
                <label className="dash-label" htmlFor="ask-severity">
                  Gravité
                </label>
                <select id="ask-severity" className="dash-input">
                  <option>Bloquant : rien ne tourne</option>
                  <option>Gênant : on avance mais mal</option>
                  <option>Question : on veut un avis</option>
                </select>
              </div>
            </div>
            <div className="dash-field">
              <label className="dash-label" htmlFor="ask-detail">
                Ce que vous avez déjà tenté
              </label>
              <textarea
                id="ask-detail"
                className="dash-textarea"
                placeholder="Message d'erreur exact, commande lancée, ce que vous avez essayé avant d'appeler."
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="dash-btn is-ghost is-sm" onClick={() => setAskOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="dash-btn is-primary is-sm"
                onClick={() => {
                  setAskOpen(false);
                  toast.success("Demande envoyée", {
                    description: "Un mentor la prend en charge depuis son espace.",
                  });
                }}
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        )}

        <div className="dash-card is-flush">
          {myRequests.length === 0 ? (
            <p className="dash-empty">Aucune demande envoyée.</p>
          ) : (
            myRequests.map((r) => (
              <div key={r.id} className="dash-row" style={{ cursor: "default", alignItems: "flex-start" }}>
                <div className="dash-row-main">
                  <div className="dash-row-title">{r.subject}</div>
                  <p
                    className="dash-muted"
                    style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5, whiteSpace: "normal" }}
                  >
                    {r.detail}
                  </p>
                  <div className="dash-mono dash-muted" style={{ fontSize: 11, marginTop: 7 }}>
                    Envoyée il y a {waitLabel(r.waitingMin)}
                    {r.takenBy && ` · suivie par ${r.takenBy}`}
                  </div>
                </div>
                <div className="dash-row-side">
                  <Pill
                    tone={
                      r.state === "resolu" ? "green" : r.state === "pris-en-charge" ? "amber" : "red"
                    }
                    dot={r.state !== "resolu"}
                  >
                    {r.state === "resolu"
                      ? "Résolu"
                      : r.state === "pris-en-charge"
                        ? "Pris en charge"
                        : "En attente"}
                  </Pill>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ----------------------------------------------------- 04 MEMBRES */}
      <section id="membres" className="dash-section">
        <SectionHead
          num="04"
          title="Membres"
          sub={members.length >= 5 ? "Équipe au complet (5 personnes max)." : undefined}
          aside={
            members.length < 5 ? (
              <button type="button" className="dash-btn is-sm" onClick={() => setAddMemberOpen((v) => !v)}>
                <People size={15} />
                Ajouter un membre
              </button>
            ) : undefined
          }
        />

        {addMemberOpen && (
          <div className="dash-card" style={{ marginBottom: 16 }}>
            <div className="dash-grid dash-grid-2" style={{ marginBottom: 14 }}>
              <div className="dash-field">
                <label className="dash-label" htmlFor="member-name">
                  Nom
                </label>
                <input
                  id="member-name"
                  className="dash-input"
                  placeholder="Prénom Nom"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="dash-field">
                <label className="dash-label" htmlFor="member-role">
                  Rôle
                </label>
                <input
                  id="member-role"
                  className="dash-input"
                  placeholder="Backend / API, Frontend, Data…"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="dash-btn is-ghost is-sm" onClick={() => setAddMemberOpen(false)}>
                Annuler
              </button>
              <button type="button" className="dash-btn is-primary is-sm" onClick={addMember} disabled={!newName.trim()}>
                Ajouter
              </button>
            </div>
          </div>
        )}

        <div className="dash-grid dash-grid-4">
          {members.map((m) => (
            <div className="dash-card" key={m.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar label={initials(m.name)} solid />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{m.name}</div>
                  <div className="dash-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {m.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- 05 ANNONCES */}
      <section id="annonces" className="dash-section">
        <SectionHead num="05" title="Annonces de l'organisation" />
        <div className="dash-card">
          <div className="dash-feed">
            {ANNOUNCEMENTS.map((a) => (
              <div className="dash-feed-item" key={a.title}>
                <span className="dash-feed-time">{a.time}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 9 }}>
                    {a.title}
                    {a.pinned && <Pill tone="teal">Épinglée</Pill>}
                  </div>
                  <p className="dash-muted" style={{ fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>
                    {a.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DashShell>
  );
}
