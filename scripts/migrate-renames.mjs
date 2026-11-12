// Migration ponctuelle de la base Upstash après un renommage de membres
// (ex. Maman -> Béné, Papa -> Denis ; voir RENAMED dans app/lib/members.js).
//
//   node scripts/migrate-renames.mjs           -> simulation : affiche ce qui changerait
//   node scripts/migrate-renames.mjs --apply   -> applique réellement
//
// Lit KV_REST_API_URL / KV_REST_API_TOKEN (ou UPSTASH_...) depuis l'environnement
// ou depuis .env.local. Peut être relancé sans risque : ce qui est déjà migré
// n'est pas modifié.
import fs from "node:fs";
import { Redis } from "@upstash/redis";
import { RENAMED, MEMBER_NAMES } from "../app/lib/members.js";

const APPLY = process.argv.includes("--apply");

// --- Variables d'environnement (.env.local si présent) ---
if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Variables KV_REST_API_URL / KV_REST_API_TOKEN introuvables.");
  process.exit(1);
}
const kv = new Redis({ url, token });

const rename = (n) => RENAMED[n] || n;
const log = (...a) => console.log(APPLY ? "  ✔" : "  •", ...a);
let changes = 0;
async function write(desc, fn) {
  changes++;
  log(desc);
  if (APPLY) await fn();
}

console.log(APPLY ? "== MIGRATION (application) ==" : "== SIMULATION (rien n'est écrit) ==");
console.log("Renommages :", Object.entries(RENAMED).map(([a, b]) => `${a} -> ${b}`).join(", "));

// 1. Souhaits et ordre : wishes:<ancien> -> wishes:<nouveau>, order:<ancien> -> order:<nouveau>
console.log("\n[Souhaits]");
for (const [oldName, newName] of Object.entries(RENAMED)) {
  const oldWishes = (await kv.hgetall(`wishes:${oldName}`)) || {};
  const n = Object.keys(oldWishes).length;
  if (n) {
    await write(`${n} souhait(s) de ${oldName} déplacé(s) vers ${newName}`, async () => {
      await kv.hset(`wishes:${newName}`, oldWishes);
      await kv.del(`wishes:${oldName}`);
    });
  }
  const oldOrder = await kv.get(`order:${oldName}`);
  if (oldOrder) {
    const newOrder = (await kv.get(`order:${newName}`)) || [];
    const merged = [...oldOrder, ...newOrder.filter((id) => !oldOrder.includes(id))];
    await write(`ordre de ${oldName} -> ${newName}`, async () => {
      await kv.set(`order:${newName}`, merged);
      await kv.del(`order:${oldName}`);
    });
  }
}

// 2. Auteurs des commentaires et réactions, dans les listes de TOUT le monde
console.log("\n[Commentaires et réactions]");
const owners = [...new Set([...MEMBER_NAMES, ...Object.keys(RENAMED)])];
for (const owner of owners) {
  // En simulation, les souhaits des anciens noms n'ont pas encore été déplacés.
  const key = `wishes:${owner}`;
  const wishes = (await kv.hgetall(key)) || {};
  const updates = {};
  for (const [id, wish] of Object.entries(wishes)) {
    let touched = false;
    const comments = (wish.comments || []).map((c) => {
      if (!RENAMED[c.author]) return c;
      touched = true;
      return { ...c, author: rename(c.author) };
    });
    const reactions = {};
    for (const [emoji, who] of Object.entries(wish.reactions || {})) {
      if (who.some((n) => RENAMED[n])) touched = true;
      reactions[emoji] = [...new Set(who.map(rename))];
    }
    if (touched) updates[id] = { ...wish, comments, reactions };
  }
  const n = Object.keys(updates).length;
  if (n) await write(`${n} souhait(s) de ${owner} : auteurs renommés`, () => kv.hset(key, updates));
}

// 3. Champs indexés par prénom : codes PIN, couleurs de profil
for (const [label, key] of [["Codes PIN", "user-pins"], ["Couleurs", "member-colors"]]) {
  console.log(`\n[${label}]`);
  const all = (await kv.hgetall(key)) || {};
  for (const [oldName, newName] of Object.entries(RENAMED)) {
    if (!(oldName in all)) continue;
    if (newName in all) {
      await write(`${newName} a déjà une valeur : celle de ${oldName} est supprimée`, () =>
        kv.hdel(key, oldName)
      );
    } else {
      await write(`${oldName} -> ${newName}`, async () => {
        await kv.hset(key, { [newName]: all[oldName] });
        await kv.hdel(key, oldName);
      });
    }
  }
}

// 4. Clés biométriques : credentialId -> { member, ... }
console.log("\n[Biométrie]");
const creds = (await kv.hgetall("webauthn-creds")) || {};
const credUpdates = {};
for (const [id, c] of Object.entries(creds)) {
  if (RENAMED[c.member]) credUpdates[id] = { ...c, member: rename(c.member) };
}
if (Object.keys(credUpdates).length) {
  await write(`${Object.keys(credUpdates).length} clé(s) réattribuée(s)`, () =>
    kv.hset("webauthn-creds", credUpdates)
  );
}

// 5. Historique (liste) : champs member / author
console.log("\n[Historique]");
const history = (await kv.lrange("history", 0, -1)) || [];
const fixed = history.map((e) =>
  RENAMED[e.member] || RENAMED[e.author]
    ? { ...e, member: rename(e.member), ...(e.author ? { author: rename(e.author) } : {}) }
    : e
);
const nHist = fixed.filter((e, i) => e !== history[i]).length;
if (nHist) {
  await write(`${nHist} entrée(s) d'historique renommée(s)`, async () => {
    await kv.del("history");
    await kv.rpush("history", ...fixed); // conserve l'ordre (plus récent en tête)
  });
}

console.log(
  changes === 0
    ? "\nRien à migrer."
    : APPLY
      ? `\nTerminé : ${changes} opération(s) appliquée(s).`
      : `\n${changes} opération(s) à faire. Relance avec --apply pour appliquer.`
);
