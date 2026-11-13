import { kv } from "../../lib/kv";

export const HISTORY_KEY = "history";

// Identifiant court unique (souhaits, commentaires, entrées d'historique).
export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Ajoute une ligne dans l'historique (liste plafonnée à ~200 entrées).
// Base limitée en requêtes : LPUSH renvoie la longueur de la liste, donc on ne
// lance le LTRIM que lorsqu'elle dépasse 250 (1 commande au lieu de 2 dans la
// quasi-totalité des cas ; la liste oscille entre 200 et 250 entrées).
export async function logHistory(entry) {
  const item = { id: newId(), at: Date.now(), ...entry };
  const length = await kv.lpush(HISTORY_KEY, item);
  if (length > 250) await kv.ltrim(HISTORY_KEY, 0, 199);
}
