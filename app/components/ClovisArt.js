"use client";

import { useEffect, useRef, useState } from "react";

// Clovis en illustration dans la page (états vides, chargement, accueil…).
// Chaque pose a sa petite animation ; un toucher le fait bondir de joie
// (la « danse de guerre » du furet) pendant un instant.
export const CLOVIS_ART = {
  bord: [420, 299],
  coucou: [410, 420],
  bond: [420, 305],
  sieste: [420, 360],
  trouve: [358, 420],
  decu: [420, 420],
  fouille: [420, 336],
  pointeur: [420, 254],
};

const DANCE_MS = 1800;

export default function ClovisArt({ pose = "coucou", width = 120, className = "", playful = true }) {
  const [dancing, setDancing] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const shown = dancing ? "bond" : pose;
  const [w, h] = CLOVIS_ART[shown] || CLOVIS_ART.coucou;

  function dance() {
    if (!playful) return;
    setDancing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDancing(false), DANCE_MS);
  }

  return (
    <span
      className={`clovis-art clovis-art-${shown} ${dancing ? "is-dancing" : ""} ${className}`}
      style={{ width }}
      onClick={dance}
      aria-hidden="true"
    >
      <img
        key={shown}
        src={`/clovis/clovis-${shown}.png`}
        width={w}
        height={h}
        alt=""
        decoding="async"
        draggable="false"
      />
    </span>
  );
}
