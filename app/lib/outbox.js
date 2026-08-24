// File d'attente (IndexedDB) des mutations faites HORS LIGNE, rejouées au retour
// du réseau. Seuls le réordonnancement et les réactions passent par ici (les
// autres actions sont désactivées hors ligne). Chaque entrée a une `key` de
// coalescence : une nouvelle entrée de même clé remplace l'ancienne, si bien
// qu'on ne garde toujours que l'ÉTAT FINAL — rejeu idempotent, dernier gagne.
import { get, set } from "idb-keyval";

const KEY = "outbox";

async function readAll() {
  try {
    return (await get(KEY)) || [];
  } catch {
    return [];
  }
}

async function writeAll(items) {
  try {
    await set(KEY, items);
  } catch {
    /* ignore */
  }
}

export async function enqueue(entry) {
  const items = await readAll();
  const i = items.findIndex((e) => e.key === entry.key);
  if (i >= 0) items[i] = entry;
  else items.push(entry);
  await writeAll(items);
  return items.length;
}

export async function all() {
  return readAll();
}

export async function remove(key) {
  const items = (await readAll()).filter((e) => e.key !== key);
  await writeAll(items);
  return items.length;
}

export async function count() {
  return (await readAll()).length;
}

export async function clear() {
  await writeAll([]);
}

// Clés de coalescence.
export const reactionKey = (member, wishId, reaction, author) =>
  `reaction:${member}:${wishId}:${reaction}:${author}`;
export const reorderKey = (member) => `reorder:${member}`;
