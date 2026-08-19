import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";
import { REACTIONS } from "../../lib/reactions";
import { kv } from "../../lib/kv";

export const dynamic = "force-dynamic";

const FAMILY_PIN = process.env.FAMILY_PIN || "1234";
const HISTORY_KEY = "history";

function checkPin(request) {
  const pin = request.headers.get("x-family-pin");
  return pin && pin === FAMILY_PIN;
}

function keyFor(member) {
  return `wishes:${member}`;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Ajoute une ligne dans l'historique (liste plafonnée à 200 entrées).
async function logHistory(entry) {
  const item = { id: newId(), at: Date.now(), ...entry };
  await kv.lpush(HISTORY_KEY, item);
  await kv.ltrim(HISTORY_KEY, 0, 199);
}

// GET /api/wishes  -> tous les souhaits de toute la famille
export async function GET(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const result = {};
  for (const member of MEMBER_NAMES) {
    const items = await kv.hgetall(keyFor(member));
    result[member] = items
      ? Object.values(items)
          .map((w) => ({ ...w, comments: w.comments || [], reactions: w.reactions || {} }))
          .sort((a, b) => a.createdAt - b.createdAt)
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

  const wish = { id: newId(), name, link, comments: [], createdAt: Date.now() };
  await kv.hset(keyFor(member), { [wish.id]: wish });
  await logHistory({ type: "add", member, name });

  return NextResponse.json({ wish });
}

// PATCH /api/wishes
//   { member, wishId, text, author }      -> ajoute un commentaire
//   { member, wishId, reaction, author }  -> bascule une réaction (👍👎❤️⭐😄)
//
// Pour une réaction : une seule lecture + une seule écriture, et AUCUNE
// entrée d'historique (on économise requêtes et stockage). Chaque personne
// ne peut poser qu'une fois chaque réaction sur un souhait : re-cliquer la
// retire (bascule).
export async function PATCH(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const wishId = (body.wishId || "").trim();
  const author = (body.author || "").trim();
  const reaction = (body.reaction || "").trim();

  if (!MEMBER_NAMES.includes(member) || !wishId) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // ---- Réaction ----
  if (reaction) {
    if (!REACTIONS.includes(reaction) || !author) {
      return NextResponse.json({ error: "Réaction invalide" }, { status: 400 });
    }
    const wish = await kv.hget(keyFor(member), wishId);
    if (!wish) {
      return NextResponse.json({ error: "Souhait introuvable" }, { status: 404 });
    }
    const reactions = wish.reactions || {};
    const who = reactions[reaction] || [];
    reactions[reaction] = who.includes(author)
      ? who.filter((n) => n !== author) // déjà présent -> on retire
      : [...who, author]; // absent -> on ajoute
    if (reactions[reaction].length === 0) delete reactions[reaction];
    wish.reactions = reactions;
    await kv.hset(keyFor(member), { [wishId]: wish });
    return NextResponse.json({ reactions });
  }

  // ---- Commentaire ----
  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const wish = await kv.hget(keyFor(member), wishId);
  if (!wish) {
    return NextResponse.json({ error: "Souhait introuvable" }, { status: 404 });
  }

  const comment = { id: newId(), text, author, createdAt: Date.now() };
  wish.comments = [...(wish.comments || []), comment];
  await kv.hset(keyFor(member), { [wishId]: wish });
  await logHistory({ type: "comment", member, name: wish.name, author, text });

  return NextResponse.json({ comment });
}

// DELETE /api/wishes
//   { member, id }                 -> supprime un souhait
//   { member, wishId, commentId }  -> supprime un commentaire
export async function DELETE(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();

  if (!MEMBER_NAMES.includes(member)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // Suppression d'un commentaire
  if (body.commentId) {
    const wishId = (body.wishId || "").trim();
    const commentId = (body.commentId || "").trim();
    const wish = await kv.hget(keyFor(member), wishId);
    if (wish) {
      wish.comments = (wish.comments || []).filter((c) => c.id !== commentId);
      await kv.hset(keyFor(member), { [wishId]: wish });
    }
    return NextResponse.json({ ok: true });
  }

  // Suppression d'un souhait
  const id = (body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const wish = await kv.hget(keyFor(member), id);
  await kv.hdel(keyFor(member), id);
  if (wish) await logHistory({ type: "remove", member, name: wish.name });

  return NextResponse.json({ ok: true });
}
