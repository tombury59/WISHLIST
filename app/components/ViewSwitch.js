"use client";

import { useEffect, useRef, useState } from "react";

// Durée un peu supérieure à la plus longue animation d'icône (la cascade de la
// liste : 165ms de retard + 420ms). Au-delà, on retire la classe pour pouvoir
// rejouer l'animation au prochain clic.
const BUMP_MS = 650;

// Sélecteur de vue : carrousel / liste. À chaque clic, l'icône choisie joue une
// petite animation (rotation-pop pour le carrousel, apparition en cascade des
// carrés pour la liste), dans le même esprit que le bouton d'actualisation.
//
// On bascule une classe (plutôt que de remonter l'élément via `key`) : ainsi
// l'animation joue exactement une fois, sans être doublée par le double-montage
// de React StrictMode en développement.
export default function ViewSwitch({ view, onChange }) {
  const [bump, setBump] = useState(null); // "carousel" | "list" | null
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pick = (v) => {
    onChange(v);
    setBump(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBump(null), BUMP_MS);
  };

  return (
    <div className="view-switch" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={"view-opt" + (view === "carousel" ? " is-active" : "")}
        onClick={() => pick("carousel")}
        aria-label="Vue carrousel"
        title="Carrousel"
      >
        <span className={"view-ico view-ico-carousel" + (bump === "carousel" ? " is-bump" : "")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="5" width="14" height="14" rx="2.5" />
          </svg>
        </span>
      </button>
      <button
        type="button"
        className={"view-opt" + (view === "list" ? " is-active" : "")}
        onClick={() => pick("list")}
        aria-label="Vue liste"
        title="Liste"
      >
        <span className={"view-ico view-ico-list" + (bump === "list" ? " is-bump" : "")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
            <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
            <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
            <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
          </svg>
        </span>
      </button>
    </div>
  );
}
