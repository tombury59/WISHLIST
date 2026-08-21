import { useEffect, useState } from "react";
import { STORAGE } from "../lib/constants";

// Mode d'affichage : "list" (liste) ou "carousel" (carrousel). LOCAL, retenu
// dans le navigateur.
export function useView() {
  const [view, setView] = useState("list");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE.view);
    if (saved === "carousel" || saved === "list") setView(saved);
  }, []);

  function changeView(v) {
    setView(v);
    localStorage.setItem(STORAGE.view, v);
  }

  return { view, changeView };
}
