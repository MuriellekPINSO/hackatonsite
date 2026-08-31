"use client";

// Petites briques partagées par les quatre espaces privés.
//
// Volontairement minces : elles ne portent aucune logique métier, juste la
// mise en forme que les quatre écrans répètent. Tout leur style vit dans le
// bloc `.dash-*` de app/globals.css, donc changer l'apparence d'une pilule ou
// d'un interrupteur se fait à un seul endroit, pour les quatre espaces.

import type { ReactNode } from "react";
import { RollingNumber } from "@/components/ui/rolling-number";
import GlowBorder from "@/components/ui/glow-border";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Tone = "neutral" | "teal" | "green" | "amber" | "red";

/* ------------------------------------------------------------------ PILULE */

export function Pill({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  /** Point de couleur devant le libellé, pour les états « vivants ». */
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={tone === "neutral" ? "dash-pill" : `dash-pill is-${tone}`}>
      {dot && <span className="dash-pill-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- EN-TÊTE DE SECTION */

export function SectionHead({
  num,
  title,
  sub,
  aside,
}: {
  /** Repère éditorial « 01 / », repris de la fiche technique de la landing. */
  num: string;
  title: string;
  sub?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="dash-section-head">
      <div>
        <div className="dash-section-num">{num} /</div>
        <h2 className="dash-section-title">{title}</h2>
        {sub && <p className="dash-section-sub">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ------------------------------------------------------------------ INDICATEUR */

export function Stat({
  label,
  value,
  unit,
  foot,
  dark = false,
  alert = false,
}: {
  label: string;
  /** Un nombre passe par l'odomètre maison ; tout le reste est rendu tel quel. */
  value: ReactNode | number;
  unit?: string;
  foot?: ReactNode;
  dark?: boolean;
  /** Entoure la carte d'une comète : réservé à ce qui attend une action
   *  humaine maintenant (une demande d'aide non prise, typiquement). Sur un
   *  écran consulté du coin de l'œil pendant 30 h, un chiffre qui change ne
   *  se remarque pas ; un mouvement, si. */
  alert?: boolean;
}) {
  return (
    <div className={dark ? "dash-card is-dark" : "dash-card"} style={alert ? { position: "relative" } : undefined}>
      {alert && (
        <GlowBorder
          glowColor="var(--teal)"
          tailColor="rgba(68,173,171,.35)"
          baseColor="transparent"
          borderWidth={1.5}
          radius={14}
          speed={90}
        />
      )}
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value">
        {/* L'odomètre rend aussi le chiffre en clair pour les lecteurs d'écran :
            les colonnes qui roulent sont décoratives. */}
        {typeof value === "number" ? <RollingNumber value={value} /> : value}
        {unit && <span className="dash-stat-unit">{unit}</span>}
      </div>
      {foot && <div className="dash-stat-foot">{foot}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- PROGRESSION */

export function Bar({
  value,
  max = 100,
  onDark = false,
  label,
}: {
  value: number;
  max?: number;
  onDark?: boolean;
  /** Décrit la barre aux lecteurs d'écran : sans ça, une barre de progression
   *  n'annonce qu'un pourcentage hors contexte. */
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={onDark ? "dash-bar on-dark" : "dash-bar"}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="dash-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------- INTERRUPTEUR */

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Repris en aria-label : le bouton n'a pas de texte propre. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="dash-switch"
    />
  );
}

/* ------------------------------------------------------------------ MODALE */

/** Confirmation d'un geste irréversible.
 *
 *  Bâtie sur l'AlertDialog de shadcn plutôt que sur un <div> à nous : il
 *  apporte le piège de focus, la fermeture à Échap, le verrouillage du
 *  défilement de fond et les rôles ARIA corrects. Notre première version
 *  n'avait rien de tout ça, et une boîte que le clavier peut quitter par
 *  derrière n'est pas une confirmation. */
export function ConfirmModal({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ AVATAR */

export function Avatar({
  label,
  solid = false,
  small = false,
}: {
  label: string;
  solid?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={["dash-avatar", solid && "is-solid", small && "is-sm"].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
