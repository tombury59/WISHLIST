import { useEffect, useState } from "react";
import { MEMBER_NAMES } from "../lib/members";
import { STORAGE } from "../lib/constants";

// Qui suis-je ? (profil choisi, à la Netflix) + onglet actuellement consulté.
// Le profil est mémorisé dans le navigateur pour ne pas le resélectionner à
// chaque fois ; le choisir ouvre aussi sa liste.
export function useProfile() {
  const [me, setMe] = useState(null);
  const [active, setActive] = useState(MEMBER_NAMES[0]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE.me);
    if (saved && MEMBER_NAMES.includes(saved)) {
      setMe(saved);
      setActive(saved);
    }
  }, []);

  function chooseMe(name) {
    setMe(name);
    setActive(name);
    localStorage.setItem(STORAGE.me, name);
  }

  return { me, setMe, active, setActive, chooseMe };
}
