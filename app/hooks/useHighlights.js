import { useEffect, useState } from "react";
import { STORAGE } from "../lib/constants";

// Objets « mis en évidence » — purement LOCAL (par appareil), stocké dans le
// navigateur. Ne change pas l'ordre, juste un léger surlignage perso.
export function useHighlights() {
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(STORAGE.highlights) || "[]");
      if (Array.isArray(h)) setHighlights(h);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleHighlight(id) {
    setHighlights((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE.highlights, JSON.stringify(next));
      return next;
    });
  }

  return { highlights, toggleHighlight };
}
