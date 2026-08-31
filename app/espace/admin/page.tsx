"use client";

// Espace ORGANISATION : pilotage de l'événement.
//
// L'écran répond à quatre questions, dans cet ordre : où en est-on dans les
// 30 h, qu'est-ce qui est ouvert ou fermé, qui mène, et que s'est-il passé
// pendant que je ne regardais pas.
//
// Le classement complet n'est PAS recopié ici : il vit sur la page publique,
// et l'orga a le même écran que tout le monde. Ce qui est propre à cet espace,
// ce sont les interrupteurs et le journal.

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Setting from "reicon-react/icons/Setting";
import Flash from "reicon-react/icons/Flash";
import Trophy from "reicon-react/icons/Trophy";
import People from "reicon-react/icons/People";
import Activity from "reicon-react/icons/Activity";
import Export from "reicon-react/icons/Export";
import { CRITERIA, MAX_SCORE, initials, participantCount } from "@/lib/competition";
import {
  ACTIVITY,
  EVENT,
  HELP_REQUESTS,
  MY_JURY_ENTRIES,
  ORG_ME,
  RANKED,
  TOGGLES,
  type ToggleKey,
} from "@/lib/espaces-mock";
import { DashShell, type DashSection } from "@/components/espaces/dash-shell";
import { Avatar, Bar, Pill, SectionHead, Stat, Switch } from "@/components/espaces/dash-ui";

const pending = HELP_REQUESTS.filter((r) => r.state === "en-attente").length;

const SECTIONS: DashSection[] = [
  { id: "pilotage", label: "Pilotage", icon: Flash },
  { id: "interrupteurs", label: "Interrupteurs", icon: Setting },
  { id: "classement", label: "Classement", icon: Trophy },
  { id: "equipes", label: "Équipes", icon: People },
  { id: "journal", label: "Journal", icon: Activity },
];

export default function AdminEspace() {
  // État local : la maquette doit se manipuler pour être jugée. Le jour du
  // branchement, ces quatre booléens deviennent une ligne de la table
  // `settings` et le setter devient un UPDATE.
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>(
    () => Object.fromEntries(TOGGLES.map((t) => [t.key, t.value])) as Record<ToggleKey, boolean>
  );

  const submitted = MY_JURY_ENTRIES.filter((e) => e.state === "submitted").length;
  const deployed = RANKED.filter((t) => t.status !== "inscrite").length;

  return (
    <DashShell role="admin" who={ORG_ME} title="Pilotage de l'événement" sections={SECTIONS}>
      <div className="dash-page-head">
        <div>
          <h1 className="dash-page-title">Pilotage</h1>
          <p className="dash-page-sub">{EVENT.brief}</p>
        </div>
        <Link href="/" className="dash-btn is-sm">
          <Export size={14} />
          Voir la page publique
        </Link>
      </div>

      {/* ------------------------------------------------------ 01 PILOTAGE */}
      <section id="pilotage" className="dash-section">
        <SectionHead
          num="01"
          title="État de la compétition"
          sub="Les quatre chiffres qui disent si l'événement se déroule normalement."
        />
        <div className="dash-grid dash-grid-4">
          <Stat
            label="Équipes en lice"
            value={RANKED.length}
            foot={
              <>
                <Pill tone="teal" dot>
                  {deployed} déployées
                </Pill>
              </>
            }
          />
          <Stat
            label="Participants"
            value={participantCount()}
            foot={<span className="dash-muted">Sur {RANKED.length} équipes</span>}
          />
          <Stat
            label="Notes soumises"
            value={submitted}
            unit={`/ ${RANKED.length}`}
            foot={<span className="dash-muted">Par le jury technique</span>}
          />
          <Stat
            label="Demandes d'aide"
            value={pending}
            alert={pending > 0}
            foot={
              pending > 0 ? (
                <Pill tone="red" dot>
                  En attente
                </Pill>
              ) : (
                <Pill tone="green">File vide</Pill>
              )
            }
          />
        </div>
      </section>

      {/* ------------------------------------------------ 02 INTERRUPTEURS */}
      <section id="interrupteurs" className="dash-section">
        <SectionHead
          num="02"
          title="Interrupteurs"
          sub="Ce qui ouvre et ferme l'événement, sans redéploiement. Chaque bascule prend effet immédiatement, pour tout le monde."
        />
        <div className="dash-card is-flush">
          {TOGGLES.map((t) => (
            <div className="dash-toggle-row" key={t.key}>
              <div>
                <div className="dash-toggle-title">
                  {t.title}
                  <Pill tone={toggles[t.key] ? "green" : "neutral"} dot={toggles[t.key]}>
                    {toggles[t.key] ? "Actif" : "Inactif"}
                  </Pill>
                </div>
                <p className="dash-toggle-desc">{t.desc}</p>
                <p className="dash-toggle-desc dash-mono" style={{ marginTop: 4, fontSize: 11.5 }}>
                  {t.effect}
                </p>
              </div>
              <Switch
                label={t.title}
                checked={toggles[t.key]}
                onChange={(next) => {
                  setToggles((s) => ({ ...s, [t.key]: next }));
                  // Une bascule change l'événement pour tout le monde, sans
                  // rien déplacer à l'écran à part un curseur de 20 px. Sans
                  // accusé de réception, on reclique par doute.
                  toast[next ? "success" : "info"](
                    next ? `${t.title} : activé` : `${t.title} : désactivé`,
                    { description: t.desc }
                  );
                }}
              />
            </div>
          ))}
        </div>
        <div className="dash-note is-amber" style={{ marginTop: 14 }}>
          <span aria-hidden="true">⚠</span>
          <span>
            <b>Verrouillez les livrables avant d&apos;ouvrir la notation.</b> Sinon une équipe peut
            changer son endpoint pendant qu&apos;un juré la teste, et deux jurés ne notent alors pas
            la même chose.
          </span>
        </div>
      </section>

      {/* --------------------------------------------------- 03 CLASSEMENT */}
      <section id="classement" className="dash-section">
        <SectionHead
          num="03"
          title="Tête de classement"
          sub={`Somme des quatre critères, ${MAX_SCORE} points au total.`}
          // L'ancre est #scoreboard, celle que la nav publique utilise déjà :
          // #classement n'a jamais existé. Nouvel onglet, parce qu'un
          // organisateur en plein événement ne doit pas perdre son tableau de
          // bord pour aller regarder la page publique.
          aside={
            <a
              href="/#scoreboard"
              target="_blank"
              rel="noopener"
              className="dash-btn is-sm"
            >
              Ouvrir le scoreboard
              <Export size={13} />
            </a>
          }
        />
        <div className="dash-grid dash-grid-3">
          {RANKED.slice(0, 3).map((t) => (
            <div className="dash-card" key={t.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
                <Avatar label={String(t.rank)} solid />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.015em" }}>
                    {t.name}
                  </div>
                  <div className="dash-muted" style={{ fontSize: 12.5 }}>
                    {t.city}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 12 }}>
                <span className="dash-num" style={{ fontSize: 30 }}>
                  {t.total}
                </span>
                <span className="dash-muted" style={{ fontSize: 14, fontWeight: 600 }}>
                  / {MAX_SCORE}
                </span>
              </div>
              <Bar value={t.total} max={MAX_SCORE} label={`Score de ${t.name}`} />
              <ul style={{ listStyle: "none", marginTop: 14, display: "grid", gap: 7 }}>
                {CRITERIA.map((c) => (
                  <li
                    key={c.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "42px 1fr 30px",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span className="dash-stat-label">{c.short}</span>
                    <Bar
                      value={t.scores[c.key]}
                      max={c.max}
                      label={`${c.label} de ${t.name}`}
                    />
                    <span
                      className="dash-mono dash-muted"
                      style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}
                    >
                      {t.scores[c.key]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ 04 ÉQUIPES */}
      <section id="equipes" className="dash-section">
        <SectionHead
          num="04"
          title="Toutes les équipes"
          sub="Une ligne par équipe : qui elle est, où elle en est, ce qu'elle a livré."
        />
        <div className="dash-card is-flush">
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ width: 58 }}>Rang</th>
                  <th>Équipe</th>
                  <th>Membres</th>
                  <th>État</th>
                  {CRITERIA.map((c) => (
                    <th key={c.key} style={{ textAlign: "right" }}>
                      {c.short}
                    </th>
                  ))}
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {RANKED.map((t) => (
                  <tr key={t.id}>
                    <td className="dash-num">{t.rank}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <Avatar label={initials(t.name)} small />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{t.name}</div>
                          <div className="dash-muted" style={{ fontSize: 12 }}>
                            {t.city}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dash-avatar-stack">
                        {t.members.slice(0, 4).map((m) => (
                          <Avatar key={m.name} label={initials(m.name)} small />
                        ))}
                      </div>
                    </td>
                    <td>
                      <Pill
                        tone={
                          t.status === "qualifiee"
                            ? "green"
                            : t.status === "en-lice"
                              ? "teal"
                              : "neutral"
                        }
                      >
                        {t.status}
                      </Pill>
                    </td>
                    {CRITERIA.map((c) => (
                      <td key={c.key} className="dash-mono" style={{ textAlign: "right" }}>
                        {t.scores[c.key]}
                      </td>
                    ))}
                    <td className="dash-num" style={{ textAlign: "right" }}>
                      {t.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ 05 JOURNAL */}
      <section id="journal" className="dash-section">
        <SectionHead
          num="05"
          title="Journal"
          sub="Ce qui s'est passé pendant que vous regardiez ailleurs. Utile au relais entre deux organisateurs."
        />
        <div className="dash-card">
          <div className="dash-feed">
            {ACTIVITY.map((a, i) => (
              <div className="dash-feed-item" key={i}>
                <span className="dash-feed-time">{a.time}</span>
                <span
                  className="dash-feed-text"
                  // Le journal vient de la base et son gras est balisé en **…** :
                  // on le convertit ici plutôt que de charger un moteur Markdown
                  // pour une seule règle.
                  dangerouslySetInnerHTML={{
                    __html: a.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </DashShell>
  );
}
