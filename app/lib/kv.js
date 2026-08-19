import { Redis } from "@upstash/redis";

// Connexion à la base Upstash en production. Selon la façon dont Vercel l'a
// branchée, les variables peuvent s'appeler KV_... ou UPSTASH_... .
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Repli EN MÉMOIRE pour le développement local, quand aucune base n'est
// configurée. Les données ne sont pas persistées (perdues au redémarrage du
// serveur) — c'est juste pour pouvoir tester l'appli sans base.
function createMemoryKv() {
  // On accroche les données à globalThis pour qu'elles SURVIVENT aux
  // rechargements de module de Next en dev (Fast Refresh). Sinon la « base »
  // en mémoire se viderait à chaque édition de fichier.
  const store = (globalThis.__memkv ||= { hashes: new Map(), lists: new Map() });
  const hashes = store.hashes; // key -> Map(field -> value)
  const lists = store.lists; // key -> array

  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

  return {
    async hgetall(key) {
      const h = hashes.get(key);
      if (!h || h.size === 0) return null;
      return Object.fromEntries([...h.entries()].map(([f, v]) => [f, clone(v)]));
    },
    async hget(key, field) {
      const h = hashes.get(key);
      return h ? clone(h.get(field)) : null;
    },
    async hset(key, obj) {
      let h = hashes.get(key);
      if (!h) hashes.set(key, (h = new Map()));
      for (const [f, v] of Object.entries(obj)) h.set(f, clone(v));
      return Object.keys(obj).length;
    },
    async hdel(key, field) {
      const h = hashes.get(key);
      return h && h.delete(field) ? 1 : 0;
    },
    async lpush(key, ...items) {
      let l = lists.get(key);
      if (!l) lists.set(key, (l = []));
      l.unshift(...items.map(clone));
      return l.length;
    },
    async ltrim(key, start, stop) {
      const l = lists.get(key);
      if (l) lists.set(key, l.slice(start, stop + 1));
      return "OK";
    },
    async lrange(key, start, stop) {
      const l = lists.get(key) || [];
      return clone(l.slice(start, stop + 1));
    },
  };
}

export const kv =
  url && token ? new Redis({ url, token }) : createMemoryKv();
