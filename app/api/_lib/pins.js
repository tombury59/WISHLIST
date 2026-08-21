import crypto from "crypto";
import { kv } from "../../lib/kv";

// Codes PIN par utilisateur, stockés HACHÉS (jamais en clair) dans un hash KV
// `member -> sha256(pin)`. Partagés entre tous les appareils de la famille :
// le code est défini la première fois qu'on ouvre un profil, puis redemandé à
// chaque changement de profil.
const PINS_KEY = "user-pins";

function hash(pin) {
  return crypto.createHash("sha256").update(String(pin)).digest("hex");
}

// Renvoie { member: true } pour les profils qui ont déjà un code défini.
export async function getPinStatus() {
  const all = (await kv.hgetall(PINS_KEY)) || {};
  const status = {};
  for (const member of Object.keys(all)) status[member] = Boolean(all[member]);
  return status;
}

export async function hasPin(member) {
  return Boolean(await kv.hget(PINS_KEY, member));
}

export async function setPin(member, pin) {
  await kv.hset(PINS_KEY, { [member]: hash(pin) });
}

export async function verifyPin(member, pin) {
  const stored = await kv.hget(PINS_KEY, member);
  return Boolean(stored) && stored === hash(pin);
}
