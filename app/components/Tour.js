"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import Clovis, { CLOVIS_ROOM } from "./Clovis";

// Petit tutoriel de première visite, façon jeu vidéo : l'écran s'assombrit, un
// projecteur entoure l'élément présenté et une bulle (la même que « Psssttt »)
// explique à quoi il sert. Les cibles sont repérées par l'attribut
// `data-tour="…"` : on prend la première visible (barre du bas sur téléphone,
// colonne de gauche sur grand écran). Aucune requête, rien en base : le fait
// d'avoir vu le tuto est retenu dans le navigateur.

const PAD = 6; // marge du projecteur autour de la cible
const GAP = 14; // espace entre le projecteur et la bulle
const EDGE = 10; // marge minimale avec les bords de l'écran

function findTarget(name) {
  if (!name) return null;
  const els = document.querySelectorAll(`[data-tour="${name}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function Tour({ steps, onStep, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null); // projecteur (null = bulle centrée)
  const [pos, setPos] = useState(null); // position calculée de la bulle
  const [leaving, setLeaving] = useState(false);
  const bubbleRef = useRef(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const pose = step.mascot || "peek"; // Clovis, la mascotte, au bord de la bulle

  // Change d'étape : prépare l'écran (rubrique, liste…) puis amène la cible
  // dans la zone visible.
  useEffect(() => {
    onStep?.(step);
    const t = setTimeout(() => {
      const el = findTarget(step.target);
      if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
      measure();
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const measure = useCallback(() => {
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    // Projecteur gardé dans l'écran (bandeau pleine largeur, barre du bas…).
    const r = el.getBoundingClientRect();
    const top = Math.max(3, r.top - PAD);
    const left = Math.max(3, r.left - PAD);
    const bottom = Math.min(window.innerHeight - 3, r.bottom + PAD);
    const right = Math.min(window.innerWidth - 3, r.right + PAD);
    setRect({ top, left, width: right - left, height: bottom - top });
  }, [step.target]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  // Place la bulle sous la cible, ou au-dessus si elle est dans la moitié basse
  // de l'écran ; la pointe vise le centre de la cible.
  useLayoutEffect(() => {
    const b = bubbleRef.current;
    if (!b) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    // Place réservée à Clovis au-dessus (ou au-dessous) de la bulle.
    const room = CLOVIS_ROOM[pose] || 0;
    if (!rect) {
      const top = Math.max(EDGE + room, (vh - bh + room) / 2);
      setPos({ left: (vw - bw) / 2, top, side: "none", at: "top-left" });
      return;
    }
    const cx = rect.left + rect.width / 2;
    const below = rect.top + rect.height / 2 < vh / 2;
    // Bulle sous la cible : Clovis passe dessous (suspendu) pour ne pas cacher la cible.
    const vert = below && pose === "peek" ? "bottom" : "top";
    let top = below ? rect.top + rect.height + GAP : rect.top - GAP - bh;
    top = Math.min(top, vh - bh - EDGE - (vert === "bottom" ? room : 0));
    top = Math.max(EDGE + (vert === "top" ? room : 0), top);
    let left = Math.min(Math.max(EDGE, cx - bw / 2), vw - bw - EDGE);
    const arrow = Math.min(Math.max(18, cx - left), bw - 18);
    // Coin opposé à la pointe de la bulle.
    const at = vert + (arrow > bw / 2 ? "-left" : "-right");
    setPos({ left, top, side: below ? "top" : "bottom", arrow, at });
  }, [rect, i, pose]);

  const finish = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  const next = useCallback(() => (last ? finish() : setI((n) => n + 1)), [last, finish]);
  const prev = () => setI((n) => Math.max(0, n - 1));

  // Clavier : → / Entrée pour avancer, ← pour reculer, Échap pour passer.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, finish]);

  return (
    <div className={"tour" + (leaving ? " is-leaving" : "")} role="dialog" aria-modal="true" aria-label="Visite guidée">
      {/* Fond qui bloque les clics (le tuto se suit avec ses boutons). */}
      <div className={"tour-shade" + (rect ? " has-spot" : "")} onClick={(e) => e.stopPropagation()} />
      {rect && (
        <div
          className="tour-spot"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}

      <div
        key={i}
        ref={bubbleRef}
        className={"tour-bubble tour-side-" + (pos?.side || "none")}
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          "--arrow": (pos?.arrow ?? 0) + "px",
          visibility: pos ? "visible" : "hidden",
        }}
      >
        <button className="icon-btn icon-btn-sm nudge-close" onClick={finish} aria-label="Passer le tuto" title="Passer">
          <Icon name="x" size={15} />
        </button>
        {step.title && <p className="tour-title">{step.title}</p>}
        <p className="nudge-text">{step.text}</p>
        <div className="tour-foot">
          <span className="tour-dots" aria-label={`Étape ${i + 1} sur ${steps.length}`}>
            {steps.map((_, n) => (
              <span key={n} className={"tour-dot" + (n === i ? " is-on" : n < i ? " is-done" : "")} />
            ))}
          </span>
          {i > 0 && (
            <button className="btn btn-soft btn-sm" onClick={prev} aria-label="Étape précédente">
              <Icon name="chevronLeft" size={16} />
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={next} autoFocus>
            {step.cta || (last ? "C'est parti" : "Suivant")}
            {!last && <Icon name="arrowRight" size={16} />}
          </button>
        </div>
        {pos && <Clovis pose={pose} at={pos.at} />}
      </div>
    </div>
  );
}
