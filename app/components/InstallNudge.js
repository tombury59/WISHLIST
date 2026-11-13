"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Clovis from "./Clovis";

const DELAY_MS = 2500; // laisse le temps de découvrir la page avant d'apparaître

// Petite bulle (téléphone) qui surgit en bas à droite, la pointe dirigée vers
// l'onglet « Compte » : elle invite à installer l'appli. Elle ne revient plus
// une fois fermée ou suivie.
export default function InstallNudge({ onGo, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Petite animation de sortie avant de disparaître.
  function close(then) {
    setLeaving(true);
    setTimeout(then, 220);
  }

  if (!visible) return null;

  return (
    <div className={"nudge" + (leaving ? " is-leaving" : "")} role="dialog" aria-label="Installer l'appli">
      <Clovis pose="peek" at="top-left" />
      <button
        className="icon-btn icon-btn-sm nudge-close"
        onClick={() => close(onDismiss)}
        aria-label="Fermer"
        title="Fermer"
      >
        <Icon name="x" size={15} />
      </button>
      <p className="nudge-text">
        <strong>Psssttt</strong>, tu sais que tu peux transformer cette page en application&nbsp;!
        Rends-toi sur ton <strong>compte</strong> pour voir comment.
      </p>
      <button className="btn btn-primary btn-sm nudge-go" onClick={() => close(onGo)}>
        J'y vais
        <Icon name="arrowRight" size={16} />
      </button>
    </div>
  );
}
