import { useEffect, useState } from "react";

// Rubrique affichée : listes, cadeaux à offrir, activité, compte.
//
// L'état vit dans le « hash » de l'URL (#a-offrir…) : le bouton Retour du
// téléphone (ou du navigateur) revient donc à la rubrique précédente au lieu de
// quitter l'appli — important pour une PWA installée. Aucune requête serveur :
// tout se passe dans le navigateur.
const HASHES = {
  lists: "",
  gifts: "#a-offrir",
  activity: "#activite",
  account: "#compte",
};

function fromHash() {
  const h = window.location.hash;
  return Object.keys(HASHES).find((k) => HASHES[k] && HASHES[k] === h) || "lists";
}

export function useSection() {
  const [section, setSection] = useState("lists");

  useEffect(() => {
    const read = () => setSection(fromHash());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  function go(next) {
    if (next === fromHash()) {
      setSection(next);
      return;
    }
    // Change le hash -> entrée d'historique + événement `hashchange`.
    window.location.hash = HASHES[next] || "#";
  }

  return { section, go };
}
