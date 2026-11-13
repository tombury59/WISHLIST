"use client";

import { useEffect, useState } from "react";
import ClovisArt from "./ClovisArt";

const SHOW_MS = 2800;

// Petite bulle de célébration qui surgit en bas de l'écran puis repart
// (réservation, première envie, cadeau reçu…). `cheer` = { pose, text, id }.
export default function ClovisToast({ cheer, onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!cheer) return;
    setLeaving(false);
    const t1 = setTimeout(() => setLeaving(true), SHOW_MS);
    const t2 = setTimeout(onDone, SHOW_MS + 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheer?.id]);

  if (!cheer) return null;
  return (
    <div key={cheer.id} className={"cheer" + (leaving ? " is-leaving" : "")} role="status">
      <ClovisArt pose={cheer.pose} width={74} playful={false} className="cheer-art" />
      <p className="cheer-text">{cheer.text}</p>
    </div>
  );
}
