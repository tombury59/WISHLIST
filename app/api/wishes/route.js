import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";

export const dynamic = "force-dynamic";

// On se connecte à la base Upstash. Selon la façon dont Vercel l'a branchée,
// les variables peuvent s'appeler KV_... ou UPSTASH_... : on gère les deux.
const kv = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// PIN partagé de la famille. À définir dans les variables d'environnement Vercel
// (FAMILY_PIN). Valeur par défaut si rien n'est configuré : 1234.
const FAMILY_PIN = process.env.FAMILY_PIN || "1234";

function checkPin(request) {
  const pin = request.headers.get("x-family-pin");
  return pin && pin === FAMILY_PIN;
}

function keyFor(member) {
  return `wishes:${member}`;
}

// GET /api/wishes  -> renvoie tous les souhaits de toute la famille
export async function GET(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const result = {};
  for (const member of MEMBER_NAMES) {
    const items = await kv.hgetall(keyFor(member));
    result[member] = items
      ? Object.values(items).sort((a, b) => a.createdAt - b.createdAt)
      : [];
  }
  return NextResponse.json({ wishes: result });
}

// POST /api/wishes  { member, name, link }  -> ajoute un souhait
export async function POST(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const name = (body.name || "").trim();
  const link = (body.link || "").trim();

  if (!MEMBER_NAMES.includes(member)) {
    return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }

  const id =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const wish = { id, name, link, createdAt: Date.now() };

  await kv.hset(keyFor(member), { [id]: wish });
  return NextResponse.json({ wish });
}

// DELETE /api/wishes  { member, id }  -> supprime un souhait
export async function DELETE(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const id = (body.id || "").trim();

  if (!MEMBER_NAMES.includes(member) || !id) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  await kv.hdel(keyFor(member), id);
  return NextResponse.json({ ok: true });
}
