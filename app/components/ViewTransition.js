"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect côté client (évite l'avertissement SSR).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Enrobe le contenu qui change (carrousel <-> liste) et rejoue une entrée en
// fondu + léger glissement à chaque changement de `trigger`, pour éviter la
// bascule brutale.
//
// La classe est posée dans un layout effect, donc AVANT la peinture : le
// nouveau contenu n'apparaît jamais en plein avant de fondre (pas de flash).
// Le conteneur reste monté (seuls ses enfants changent), donc l'animation joue
// une seule fois — pas de doublon dû au double-montage de React StrictMode.
// Pas d'animation au tout premier rendu.
export default function ViewTransition({ trigger, children }) {
  const [animating, setAnimating] = useState(false);
  const first = useRef(true);
  const timer = useRef(null);

  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setAnimating(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnimating(false), 400);
  }, [trigger]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={"view-content" + (animating ? " is-switching" : "")}>
      {children}
    </div>
  );
}
