"use client";

// Espace JURY : notation des équipes.
//
// Deux partis pris qui diffèrent de la plateforme iSHEERO dont cet écran
// s'inspire :
//
//   • La file et la fiche de notation cohabitent à l'écran au lieu de vivre sur
//     deux pages. Un juré note douze équipes d'affilée sur le même sujet : lui
//     faire faire un aller-retour entre la liste et le formulaire à chaque fois
//     lui coûte douze allers-retours et lui fait perdre le fil de sa
//     comparaison.
//
//   • Les quatre critères pèsent 25 points chacun, donc la somme brute EST la
//     note sur 100. Pas de pondération à expliquer au juré, et pas de division
//     à se tromper.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RollingNumber } from "@/components/ui/rolling-number";
import Trophy from "reicon-react/icons/Trophy";
import Edit from "reicon-react/icons/Edit";
import Lock from "reicon-react/icons/Lock";
import TickCircle from "reicon-react/icons/TickCircle";
import { CRITERIA, MAX_SCORE, initials, type CriterionKey } from "@/lib/competition";
import {
  CRITERION_HELP,
  EMPTY_DRAFT,
  JURY_ME,
  MY_JURY_ENTRIES,
  RANKED,
  draftTotal,
  teamById,
  type ScoreDraft,
} from "@/lib/espaces-mock";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashShell, type DashSection } from "@/components/espaces/dash-shell";
import { Avatar, Bar, ConfirmModal, Pill, SectionHead } from "@/components/espaces/dash-ui";

type EntryState = "todo" | "draft" | "submitted";
type Entry = { state: EntryState; scores: ScoreDraft; comment: string };

const STATE_LABEL: Record<EntryState, string> = {
  todo: "À noter",
  draft: "Brouillon",
  submitted: "Soumise",
};

const STATE_TONE = { todo: "neutral", draft: "amber", submitted: "green" } as const;

const FILTERS: { id: "all" | EntryState; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "todo", label: "À noter" },
  { id: "draft", label: "Brouillons" },
  { id: "submitted", label: "Soumises" },
];

/** État initial : une entrée par équipe, complétée par ce que le juré a déjà saisi. */
function initialEntries(): Record<string, Entry> {
  const base: Record<string, Entry> = {};
  for (const t of RANKED) {
    base[t.id] = { state: "todo", scores: { ...EMPTY_DRAFT }, comment: "" };
  }
  for (const e of MY_JURY_ENTRIES) {
    base[e.teamId] = { state: e.state, scores: { ...e.scores }, comment: e.comment };
  }
  return base;
}

export default function JuryEspace() {
  const [entries, setEntries] = useState<Record<string, Entry>>(initialEntries);
  const [filter, setFilter] = useState<"all" | EntryState>("all");
  const [selectedId, setSelectedId] = useState<string>(RANKED[0]!.id);
  const [confirming, setConfirming] = useState(false);

  const counts = useMemo(() => {
    const c = { all: RANKED.length, todo: 0, draft: 0, submitted: 0 };
    for (const t of RANKED) c[entries[t.id]!.state] += 1;
    return c;
  }, [entries]);

  const visible = RANKED.filter((t) => filter === "all" || entries[t.id]!.state === filter);
  const selected = teamById(selectedId)!;
  const entry = entries[selectedId]!;
  const total = draftTotal(entry.scores);
  const locked = entry.state === "submitted";

  const sections: DashSection[] = [
    { id: "progression", label: "Progression", icon: Trophy },
    { id: "notation", label: "Notation", icon: Edit, count: counts.todo, hot: counts.todo > 0 },
    { id: "soumises", label: "Mes notes", icon: Lock, count: counts.submitted },
  ];

  function setScore(key: CriterionKey, value: number) {
    setEntries((s) => ({
      ...s,
      [selectedId]: {
        ...s[selectedId]!,
        // Toute saisie sur une note jamais ouverte la fait passer en brouillon :
        // le juré n'a pas à penser à « enregistrer » pour ne rien perdre.
        state: s[selectedId]!.state === "todo" ? "draft" : s[selectedId]!.state,
        scores: { ...s[selectedId]!.scores, [key]: value },
      },
    }));
  }

  function submit() {
    setEntries((s) => ({ ...s, [selectedId]: { ...s[selectedId]!, state: "submitted" } }));
    setConfirming(false);
    toast.success("Note soumise et verrouillée.", {
      description: `${selected.name} · ${total} / ${MAX_SCORE}`,
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
    <DashShell role="jury" who={JURY_ME} title="Jury" sections={sections}>
      <div className="dash-page-head">
        <div>
          <h1 className="dash-page-title">Vos notations</h1>
          <p className="dash-page-sub">
            Toutes les équipes traitent le même sujet : notez ce qui tourne réellement, pas
            l&apos;intention.
          </p>
        </div>
      </div>

      {/* --------------------------------------------------- 01 PROGRESSION */}
      <section id="progression" className="dash-section">
        <SectionHead num="01" title="Où vous en êtes" />
        <div className="dash-grid dash-grid-2">
          <div className="dash-card is-dark">
            <div className="dash-stat-label">Notes soumises</div>
            <div className="dash-stat-value">
              {counts.submitted}
              <span className="dash-stat-unit">/ {RANKED.length}</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <Bar
                value={counts.submitted}
                max={RANKED.length}
                onDark
                label={`${counts.submitted} équipes notées sur ${RANKED.length}`}
              />
            </div>
            {counts.draft > 0 && (
              <p className="dash-stat-foot dash-mono">
                {counts.draft} brouillon{counts.draft > 1 ? "s" : ""} en cours
              </p>
            )}
          </div>
          <div className="dash-card">
            <div className="dash-stat-label">Barème</div>
            <ul style={{ listStyle: "none", marginTop: 14, display: "grid", gap: 11 }}>
              {CRITERIA.map((c) => (
                <li key={c.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 13.5,
                    }}
                  >
                    <b style={{ fontWeight: 700 }}>{c.label}</b>
                    <span className="dash-mono dash-muted">{c.max} pts</span>
                  </div>
                  <p className="dash-muted" style={{ fontSize: 12, marginTop: 3, lineHeight: 1.45 }}>
                    {CRITERION_HELP[c.key]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ 02 NOTATION */}
      <section id="notation" className="dash-section">
        <SectionHead
          num="02"
          title="Notation"
          sub="Choisissez une équipe à gauche, notez à droite. Rien n'est définitif avant la soumission."
          aside={
            <div className="dash-chips">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="dash-chip"
                  data-active={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <span className="dash-chip-count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          }
        />

        <div className="dash-split">
          {/* File de notation */}
          <div className="dash-card is-flush">
            {visible.length === 0 ? (
              <p className="dash-empty">Aucune équipe dans ce filtre.</p>
            ) : (
              visible.map((t) => {
                const e = entries[t.id]!;
                const sub = draftTotal(e.scores);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="dash-row"
                    data-selected={t.id === selectedId}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <Avatar label={initials(t.name)} />
                    <span className="dash-row-main">
                      <span className="dash-row-title">{t.name}</span>
                      <span className="dash-row-sub">{t.city}</span>
                    </span>
                    <span className="dash-row-side">
                      <Pill tone={STATE_TONE[e.state]} dot={e.state !== "todo"}>
                        {STATE_LABEL[e.state]}
                      </Pill>
                      {sub != null && (
                        <span className="dash-num" style={{ fontSize: 15 }}>
                          {sub}
                          <span className="dash-muted" style={{ fontSize: 11, fontWeight: 600 }}>
                            /{MAX_SCORE}
                          </span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Fiche de notation */}
          <div className="dash-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 18,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <Avatar label={initials(selected.name)} solid />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>
                  {selected.name}
                </div>
                <div className="dash-muted" style={{ fontSize: 12.5 }}>
                  {selected.city} · {selected.members.length} membres
                </div>
              </div>
              {locked && (
                <Pill tone="green" dot>
                  Verrouillée
                </Pill>
              )}
            </div>

            {CRITERIA.map((c, i) => {
              const value = entry.scores[c.key];
              const id = `note-${c.key}`;
              return (
                <div className="dash-criterion" key={c.key}>
                  <div className="dash-criterion-head">
                    <label className="dash-criterion-label" htmlFor={id}>
                      <span className="dash-criterion-weight">{String(i + 1).padStart(2, "0")}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span style={{ textDecoration: "underline dotted", textUnderlineOffset: 4, cursor: "help" }}>
                            {c.label}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{CRITERION_HELP[c.key]}</TooltipContent>
                      </Tooltip>
                      <span className="dash-criterion-weight">· {c.max} pts</span>
                    </label>
                    <span className="dash-criterion-score" aria-live="polite">
                      {value ?? "–"}
                      <span className="dash-criterion-max">/ {c.max}</span>
                    </span>
                  </div>
                  <input
                    id={id}
                    type="range"
                    className="dash-range"
                    min={0}
                    max={c.max}
                    step={1}
                    disabled={locked}
                    // Curseur au milieu tant que rien n'est saisi : la note
                    // stockée reste null, mais le pouce a une position de départ
                    // neutre plutôt que collé à zéro, qui se lirait comme un avis.
                    value={value ?? Math.round(c.max / 2)}
                    onChange={(ev) => setScore(c.key, Number(ev.target.value))}
                    aria-describedby={`${id}-help`}
                  />
                  <p className="dash-criterion-help" id={`${id}-help`}>
                    {CRITERION_HELP[c.key]}
                  </p>
                </div>
              );
            })}

            <div className="dash-field" style={{ marginTop: 18 }}>
              <label className="dash-label" htmlFor="note-comment">
                Commentaire (privé, visible par l&apos;organisation)
              </label>
              <textarea
                id="note-comment"
                className="dash-textarea"
                disabled={locked}
                value={entry.comment}
                placeholder="Ce qui vous a convaincu, ce qui manquait."
                onChange={(ev) =>
                  setEntries((s) => ({
                    ...s,
                    [selectedId]: { ...s[selectedId]!, comment: ev.target.value },
                  }))
                }
              />
            </div>

            <div className="dash-total" style={{ marginTop: 20 }}>
              <div>
                <div className="dash-stat-label">Total</div>
                <div className="dash-total-value">
                  {/* Odomètre : c'est le chiffre que le juré fixe pendant qu'il
                      bouge les curseurs, et le voir rouler rend le lien entre
                      son geste et le total immédiat. */}
                  {total == null ? "–" : <RollingNumber value={total} duration={420} />}
                  <span className="dash-total-max">/ {MAX_SCORE}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                {locked ? (
                  <span className="dash-muted" style={{ fontSize: 12.5 }}>
                    Contactez l&apos;organisation pour rouvrir cette note.
                  </span>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="dash-btn is-sm"
                      onClick={() =>
                        toast("Brouillon enregistré.", {
                          description: "Vous pouvez y revenir tant que la note n'est pas soumise.",
                        })
                      }
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      className="dash-btn is-primary is-sm"
                      disabled={total == null}
                      title={total == null ? "Notez les quatre critères d'abord" : undefined}
                      onClick={() => setConfirming(true)}
                    >
                      Soumettre
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- 03 SOUMISES */}
      <section id="soumises" className="dash-section">
        <SectionHead
          num="03"
          title="Mes notes soumises"
          sub="Verrouillées. Elles comptent déjà dans le classement public."
        />
        <div className="dash-card is-flush">
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Équipe</th>
                  {CRITERIA.map((c) => (
                    <th key={c.key} style={{ textAlign: "right" }}>
                      {c.short}
                    </th>
                  ))}
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {RANKED.filter((t) => entries[t.id]!.state === "submitted").map((t) => {
                  const e = entries[t.id]!;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>{t.name}</td>
                      {CRITERIA.map((c) => (
                        <td key={c.key} className="dash-mono" style={{ textAlign: "right" }}>
                          {e.scores[c.key] ?? "–"}
                        </td>
                      ))}
                      <td className="dash-num" style={{ textAlign: "right" }}>
                        {draftTotal(e.scores) ?? "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {counts.submitted === 0 && <p className="dash-empty">Aucune note soumise pour l&apos;instant.</p>}
        </div>
      </section>

      {confirming && (
        <ConfirmModal
          title="Soumettre cette note ?"
          text={`${selected.name} obtiendra ${total} / ${MAX_SCORE}. Une note soumise ne peut plus être modifiée sans passer par l'organisation.`}
          confirmLabel="Soumettre"
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </DashShell>
    </TooltipProvider>
  );
}
