import { kv } from "../../lib/kv";

export const HISTORY_KEY = "history";

// Identifiant court unique (souhaits, commentaires, entrées d'historique).
export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Ajoute une ligne dans l'historique (liste plafonnée à 200 entrées).
export async function logHistory(entry) {
  const item = { id: newId(), at: Date.now(), ...entry };
  await kv.lpush(HISTORY_KEY, item);
  await kv.ltrim(HISTORY_KEY, 0, 199);
}
