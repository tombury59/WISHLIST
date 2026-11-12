import { RENAMED } from "./members";
import { STORAGE } from "./constants";

const USERPINS_KEY = "family-userpinhash"; // cf. offline-store.js

const rename = (n) => RENAMED[n] || n;

// Remplace les anciens prénoms (Maman, Papa…) mémorisés dans CE navigateur :
// profil choisi, biométrie enrôlée, empreintes de code de profil.
// Sans effet si rien n'est à renommer : peut être appelé à chaque démarrage.
export function migrateLocalNames() {
  try {
    const me = localStorage.getItem(STORAGE.me);
    if (me && RENAMED[me]) localStorage.setItem(STORAGE.me, rename(me));

    const bio = JSON.parse(localStorage.getItem(STORAGE.biometric) || "null");
    if (Array.isArray(bio) && bio.some((e) => RENAMED[typeof e === "string" ? e : e?.member])) {
      const next = bio.map((e) =>
        typeof e === "string" ? rename(e) : { ...e, member: rename(e.member) }
      );
      localStorage.setItem(STORAGE.biometric, JSON.stringify(next));
    }

    const pins = JSON.parse(localStorage.getItem(USERPINS_KEY) || "null");
    if (pins && typeof pins === "object" && Object.keys(pins).some((k) => RENAMED[k])) {
      const next = {};
      for (const [k, v] of Object.entries(pins)) next[rename(k)] ??= v;
      localStorage.setItem(USERPINS_KEY, JSON.stringify(next));
    }
  } catch {
    /* stockage indisponible : tant pis */
  }
}
