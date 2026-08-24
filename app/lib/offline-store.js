// Cache local (IndexedDB) des souhaits, pour l'affichage hors ligne et un
// démarrage instantané. Plus une empreinte du PIN famille pour autoriser une
// reprise de session hors ligne sans jamais stocker le code en clair.
import { get, set } from "idb-keyval";

const WISHES_KEY = "wishes-cache";
const PINHASH_KEY = "family-pinhash"; // localStorage

export async function setCachedWishes(wishes) {
  try {
    await set(WISHES_KEY, wishes);
  } catch {
    /* stockage indisponible : tant pis */
  }
}

export async function getCachedWishes() {
  try {
    return (await get(WISHES_KEY)) || null;
  } catch {
    return null;
  }
}

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mémorise l'empreinte du PIN après une connexion EN LIGNE réussie.
export async function setPinHash(pin) {
  try {
    localStorage.setItem(PINHASH_KEY, await sha256(pin));
  } catch {
    /* ignore */
  }
}

// Vrai si `pin` correspond à la dernière connexion en ligne (reprise offline).
export async function matchPin(pin) {
  try {
    const stored = localStorage.getItem(PINHASH_KEY);
    return Boolean(stored) && stored === (await sha256(pin));
  } catch {
    return false;
  }
}
