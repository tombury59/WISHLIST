"use client";

import { useEffect, useRef, useState } from "react";
import { REFRESH_COOLDOWN_MS } from "../lib/constants";

// Icône « deux flèches qui tournent » (refresh). Couleur pilotée par
// `currentColor` pour l'animation de remplissage.
function RefreshIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 1-9 9c-2.4 0-4.6-.94-6.2-2.5L3 16" />
      <path d="M3 12a9 9 0 0 1 9-9c2.4 0 4.6.94 6.2 2.5L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

// Bouton d'actualisation manuelle des souhaits, cliquable au plus une fois
// toutes les REFRESH_COOLDOWN_MS. Indicateur visuel : au clic l'icône perd sa
// couleur (gris) puis se remplit progressivement (bas -> haut) jusqu'au noir,
// de façon fluide, le temps du cooldown.
export default function RefreshButton({ onRefresh }) {
  const [cooling, setCooling] = useState(false);
  const [runId, setRunId] = useState(0); // relance l'animation à chaque clic
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleClick() {
    if (cooling) return;
    onRefresh?.();
    setRunId((n) => n + 1);
    setCooling(true);
    timerRef.current = setTimeout(() => setCooling(false), REFRESH_COOLDOWN_MS);
  }

  return (
    <button
      type="button"
      className="refresh-btn"
      onClick={handleClick}
      disabled={cooling}
      aria-label="Actualiser"
      title="Actualiser"
    >
      <span
        className={"refresh-icon-wrap" + (cooling ? " is-spinning" : "")}
        key={runId}
        style={{ "--refill-ms": REFRESH_COOLDOWN_MS + "ms" }}
      >
        {/* Base grise (visible pendant que le remplissage remonte). */}
        <RefreshIcon className="refresh-icon refresh-icon-base" />
        {/* Remplissage noir animé, découpé du bas vers le haut. */}
        <RefreshIcon
          className={"refresh-icon refresh-icon-fill" + (cooling ? " is-refilling" : "")}
        />
      </span>
    </button>
  );
}
