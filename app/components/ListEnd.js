"use client";

import { useEffect, useRef, useState } from "react";
import ClovisArt from "./ClovisArt";

// Bas d'une liste bien remplie : Clovis sort de derrière un petit rebord
// quand on arrive au bout (« Tu as tout vu ! »). Rien n'apparaît tant qu'on
// n'a pas fait défiler jusque-là. Le toucher le fait danser.
export default function ListEnd() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={"list-end" + (seen ? " is-seen" : "")} aria-hidden="true">
      <div className="list-end-stage">
        <span className="list-end-peek">
          <ClovisArt pose="bord" width={92} trimTop={false} />
        </span>
        <span className="list-end-bubble">Tu as tout vu !</span>
      </div>
    </div>
  );
}
