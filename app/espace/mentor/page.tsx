"use client";

// Espace MENTOR : accompagnement des équipes.
//
// C'est le seul des quatre écrans qui n'a aucun équivalent chez iSHEERO : leur
// rôle « mentor » existe en base, avec ses politiques de sécurité, mais n'a
// jamais reçu d'interface. Sur leur format (un Demo Day, des sujets différents)
// ça se défend. Sur le nôtre, non : trente heures, un sujet unique, et un
// mentor qui est le goulot d'étranglement de la nuit.
//
// D'où les deux pièces centrales : une file d'attente ordonnée par gravité, et
// un panneau de blocages déjà rencontrés. Quand quarante équipes déploient le
// même modèle sur le même matériel, elles butent sur les mêmes murs, et
// réexpliquer douze fois le même contournement est le vrai coût de la nuit.

import { useState } from "react";
import { toast } from "sonner";
import Lifebuoy from "reicon-react/icons/Lifebuoy";
import People from "reicon-react/icons/People";
import Danger from "reicon-react/icons/Danger";
import Note from "reicon-react/icons/Note";
import { MAX_SCORE, initials } from "@/lib/competition";
import {
  HELP_REQUESTS,
  KNOWN_BLOCKERS,
  MENTOR_ME,
  RANKED,
  teamById,
  waitLabel,
  type HelpRequest,
} from "@/lib/espaces-mock";
import { DashShell, type DashSection } from "@/components/espaces/dash-shell";
import { Avatar, Bar, Pill, SectionHead, Stat } from "@/components/espaces/dash-ui";

const SEVERITY_TONE = { bloquant: "red", "gênant": "amber", question: "neutral" } as const;
const STATE_TONE = { "en-attente": "red", "pris-en-charge": "amber", resolu: "green" } as const;
const STATE_LABEL = {
  "en-attente": "En attente",
  "pris-en-charge": "Pris en charge",
  resolu: "Résolu",
} as const;

/** Équipes que ce mentor suit nommément. */
const FOLLOWED = ["sème-inference", "tokens-atlantique", "cluster-cotonou"];

export default function MentorEspace() {
  const [requests, setRequests] = useState<HelpRequest[]>(HELP_REQUESTS);
  const [notes, setNotes] = useState<Record<string, string>>({
    "sème-inference": "Bloqués sur la mémoire GPU depuis 2 h. Vérifier qu'ils ont bien baissé gpu-memory-utilization.",
  });

  const pending = requests.filter((r) => r.state === "en-attente");
  const mine = requests.filter((r) => r.state === "pris-en-charge");

  const sections: DashSection[] = [
    {
      id: "file",
      label: "File d'aide",
      icon: Lifebuoy,
      count: pending.length,
      hot: pending.length > 0,
    },
    { id: "equipes", label: "Mes équipes", icon: People, count: FOLLOWED.length },
    { id: "blocages", label: "Blocages connus", icon: Danger },
    { id: "notes", label: "Notes privées", icon: Note },
  ];

  function take(id: string) {
    const req = requests.find((r) => r.id === id);
    setRequests((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, state: "pris-en-charge", takenBy: MENTOR_ME.name } : r
      )
    );
    // La prise en charge est ce qui empêche deux mentors de se déplacer pour la
    // même équipe : elle doit se voir immédiatement, chez celui qui prend.
    toast.success("Demande prise en charge", {
      description: req ? `${teamById(req.teamId)?.name ?? req.teamId} · ${req.subject}` : undefined,
    });
  }

  function resolve(id: string) {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, state: "resolu" } : r)));
    toast.success("Demande résolue", { description: "L'équipe est prévenue depuis son espace." });
  }

  return (
    <DashShell role="mentor" who={MENTOR_ME} title="Mentor" sections={sections}>
      <div className="dash-page-head">
        <div>
          <h1 className="dash-page-title">Accompagnement</h1>
          <p className="dash-page-sub">
            Les équipes vous appellent depuis leur espace. La file est triée par gravité, pas par
            ordre d&apos;arrivée.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- 01 FILE D'AIDE */}
      <section id="file" className="dash-section">
        <SectionHead num="01" title="File d'aide" />

        <div className="dash-grid dash-grid-3" style={{ marginBottom: 18 }}>
          <Stat
            label="En attente"
            value={pending.length}
            foot={
              pending.length > 0 ? (
                <Pill tone="red" dot>
                  Plus ancienne : {waitLabel(Math.max(...pending.map((r) => r.waitingMin)))}
                </Pill>
              ) : (
                <Pill tone="green">Personne n&apos;attend</Pill>
              )
            }
          />
          <Stat
            label="Vous traitez"
            value={mine.length}
            foot={<span className="dash-muted">Demandes prises en charge</span>}
          />
          <Stat
            label="Résolues"
            value={requests.filter((r) => r.state === "resolu").length}
            foot={<span className="dash-muted">Depuis le début de l&apos;événement</span>}
          />
        </div>

        <div className="dash-card is-flush">
          {requests.length === 0 ? (
            <p className="dash-empty">Aucune demande. Profitez-en.</p>
          ) : (
            // Tri : les bloquants d'abord, puis par temps d'attente décroissant.
            // Une question posée il y a 20 min passe après un service à terre.
            [...requests]
              .sort((a, b) => {
                const weight = { bloquant: 0, "gênant": 1, question: 2 };
                const state = { "en-attente": 0, "pris-en-charge": 1, resolu: 2 };
                return (
                  state[a.state] - state[b.state] ||
                  weight[a.severity] - weight[b.severity] ||
                  b.waitingMin - a.waitingMin
                );
              })
              .map((r) => {
                const team = teamById(r.teamId);
                return (
                  <div
                    key={r.id}
                    className="dash-row"
                    style={{ cursor: "default", alignItems: "flex-start" }}
                  >
                    <Avatar label={team ? initials(team.name) : "??"} />
                    <div className="dash-row-main">
                      <div className="dash-row-title">
                        {r.subject}
                        <Pill tone={SEVERITY_TONE[r.severity]} dot={r.severity === "bloquant"}>
                          {r.severity}
                        </Pill>
                      </div>
                      <p
                        className="dash-muted"
                        style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5, whiteSpace: "normal" }}
                      >
                        {r.detail}
                      </p>
                      <div
                        className="dash-mono dash-muted"
                        style={{ fontSize: 11, marginTop: 7, display: "flex", gap: 12, flexWrap: "wrap" }}
                      >
                        <span>{team?.name ?? r.teamId}</span>
                        <span>attend depuis {waitLabel(r.waitingMin)}</span>
                        {r.takenBy && <span>· {r.takenBy}</span>}
                      </div>
                    </div>
                    <div className="dash-row-side">
                      <Pill tone={STATE_TONE[r.state]} dot={r.state !== "resolu"}>
                        {STATE_LABEL[r.state]}
                      </Pill>
                      {r.state === "en-attente" && (
                        <button
                          type="button"
                          className="dash-btn is-primary is-sm"
                          onClick={() => take(r.id)}
                        >
                          Prendre
                        </button>
                      )}
                      {r.state === "pris-en-charge" && (
                        <button
                          type="button"
                          className="dash-btn is-sm"
                          onClick={() => resolve(r.id)}
                        >
                          Résoudre
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ 02 ÉQUIPES */}
      <section id="equipes" className="dash-section">
        <SectionHead
          num="02"
          title="Mes équipes"
          sub="Celles dont vous avez la charge. Leur score n'est là que pour repérer celle qui décroche."
        />
        <div className="dash-grid dash-grid-3">
          {FOLLOWED.map((id) => {
            const t = teamById(id);
            if (!t) return null;
            const open = requests.filter((r) => r.teamId === id && r.state !== "resolu").length;
            return (
              <div className="dash-card" key={id}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
                  <Avatar label={initials(t.name)} solid />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.015em" }}>
                      {t.name}
                    </div>
                    <div className="dash-muted" style={{ fontSize: 12.5 }}>
                      {t.city} · rang {t.rank}
                    </div>
                  </div>
                </div>
                {open > 0 ? (
                  <Pill tone="amber" dot>
                    {open} demande{open > 1 ? "s" : ""} ouverte{open > 1 ? "s" : ""}
                  </Pill>
                ) : (
                  <Pill tone="green">Rien en cours</Pill>
                )}
                <div style={{ marginTop: 14 }}>
                  <Bar value={t.total} max={MAX_SCORE} label={`Score de ${t.name}`} />
                  <div
                    className="dash-mono dash-muted"
                    style={{ fontSize: 11.5, marginTop: 7, display: "flex", justifyContent: "space-between" }}
                  >
                    <span>
                      {t.total} / {MAX_SCORE}
                    </span>
                    <span>{t.members.length} membres</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------- 03 BLOCAGES */}
      <section id="blocages" className="dash-section">
        <SectionHead
          num="03"
          title="Blocages connus"
          sub="Mêmes GPU, même modèle, mêmes murs. Ce panneau se remplit tout seul à mesure que les demandes se répètent."
        />
        <div className="dash-grid dash-grid-3">
          {KNOWN_BLOCKERS.map((b) => (
            <div className="dash-card" key={b.title}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{b.title}</div>
                <Pill tone={b.hits >= 8 ? "red" : "amber"}>×{b.hits}</Pill>
              </div>
              <p className="dash-muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.55 }}>
                {b.hint}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- 04 NOTES */}
      <section id="notes" className="dash-section">
        <SectionHead
          num="04"
          title="Notes privées"
          sub="Visibles de vous seul. Elles servent surtout au relais entre deux mentors qui se succèdent."
        />
        <div className="dash-grid dash-grid-2">
          {FOLLOWED.map((id) => {
            const t = teamById(id);
            if (!t) return null;
            return (
              <div className="dash-card" key={id}>
                <div className="dash-field">
                  <label className="dash-label" htmlFor={`note-${id}`}>
                    {t.name}
                  </label>
                  <textarea
                    id={`note-${id}`}
                    className="dash-textarea"
                    value={notes[id] ?? ""}
                    placeholder="Où ils en sont, ce qui les bloque, ce qu'il faut vérifier au prochain passage."
                    onChange={(e) => setNotes((n) => ({ ...n, [id]: e.target.value }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </DashShell>
  );
}
