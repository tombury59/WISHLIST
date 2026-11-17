"use client";

import { useEffect, useRef, useState } from "react";
import { FRAMES, clovisSrc, useSeason } from "../lib/season";

// Clovis en illustration dans la page (états vides, chargement, accueil…).
// Chaque pose a sa petite animation ; un toucher le fait bondir de joie
// (la « danse de guerre » du furet) pendant un instant.
//
// Les poses « bord », « coucou » et « sieste » ont une tenue de saison (Noël,
// Nouvel An, Halloween) dans un cadre commun, plus grand que le dessin (place
// pour les chapeaux). `width` reste la largeur du dessin habituel : le cadre
// est agrandi en conséquence et sa marge du haut est retirée (`trimTop`) pour
// que la mise en page ne bouge pas ; le chapeau déborde alors vers le haut.
export const CLOVIS_ART = {
  bord: FRAMES.bord.size,
  coucou: FRAMES.coucou.size,
  bond: [420, 305],
  sieste: FRAMES.sieste.size,
  trouve: [358, 420],
  decu: [420, 420],
  fouille: [420, 336],
  pointeur: [420, 254],
};

const DANCE_MS = 1800;

export default function ClovisArt({
  pose = "coucou",
  width = 120,
  className = "",
  playful = true,
  trimTop = true,
}) {
  const season = useSeason();
  const [dancing, setDancing] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const shown = dancing ? "bond" : pose;
  const [w, h] = CLOVIS_ART[shown] || CLOVIS_ART.coucou;
  const frame = FRAMES[shown];
  const boxWidth = frame ? width * frame.factor : width;
  const marginTop = frame && trimTop ? -(boxWidth * (h / w) * frame.top) : undefined;

  function dance() {
    if (!playful) return;
    setDancing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDancing(false), DANCE_MS);
  }

  return (
    <span
      className={`clovis-art clovis-art-${shown} ${dancing ? "is-dancing" : ""} ${className}`}
      style={{ width: boxWidth, marginTop }}
      onClick={dance}
      aria-hidden="true"
    >
      <img
        key={shown}
        src={clovisSrc(shown, season)}
        width={w}
        height={h}
        alt=""
        decoding="async"
        draggable="false"
      />
    </span>
  );
}
