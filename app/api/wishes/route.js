import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";
import { REACTIONS } from "../../lib/reactions";
import { kv } from "../../lib/kv";
import { checkPin, unauthorized } from "../_lib/auth";
import { logHistory, newId } from "../_lib/history";

export const dynamic = "force-dynamic";

function keyFor(member) {
  return `wishes:${member}`;
}

// Ordre d'affichage choisi à la main (glisser-déposer). On stocke, par membre,
// un simple tableau d'IDs. Réordonner = réécrire cette seule clé (1 écriture),
// quel que soit le nombre de déplacements.
function orderKeyFor(member) {
  return `order:${member}`;
}

// Trie `list` selon `order` (tableau d'IDs). Les souhaits absents de `order`
// (nouveaux, jamais rangés) passent en fin, du plus ancien au plus récent.
function sortByOrder(list, order) {
  const rank = new Map((order || []).map((id, i) => [id, i]));
  const BIG = Number.MAX_SAFE_INTEGER;
  return [...list].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : BIG;
    const rb = rank.has(b.id) ? rank.get(b.id) : BIG;
    if (ra !== rb) return ra - rb;
    return a.createdAt - b.createdAt; // départage les non-rangés
  });
}

// GET /api/wishes  -> tous les souhaits de toute la famille
export async function GET(request) {
  if (!checkPin(request)) return unauthorized();

  const result = {};
  for (const member of MEMBER_NAMES) {
    const items = await kv.hgetall(keyFor(member));
    const list = items
      ? Object.values(items).map((w) => ({
          ...w,
          comments: w.comments || [],
          reactions: w.reactions || {},
        }))
      : [];
    const order = (await kv.get(orderKeyFor(member))) || [];
    result[member] = sortByOrder(list, order);
  }
  return NextResponse.json({ wishes: result });
}

// POST /api/wishes  { member, name, link }  -> ajoute un souhait
export async function POST(request) {
  if (!checkPin(request)) return unauthorized();

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
  if (!checkPin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const wishId = (body.wishId || "").trim();
  const author = (body.author || "").trim();
  const reaction = (body.reaction || "").trim();

  // ---- Réordonnancement (glisser-déposer) ----
  // { op: "reorder", member, ids: [...] } -> réécrit l'ordre du membre.
  // Une seule écriture, pas d'entrée d'historique. On ne garde que les IDs qui
  // existent réellement (ignore le bruit / les souhaits supprimés entre-temps).
  if (body.op === "reorder") {
    if (!MEMBER_NAMES.includes(member)) {
      return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
    }
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    const items = (await kv.hgetall(keyFor(member))) || {};
    const clean = ids.filter((id) => items[id]);
    await kv.set(orderKeyFor(member), clean);
    return NextResponse.json({ ok: true, ids: clean });
  }

  if (!MEMBER_NAMES.includes(member) || !wishId) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // ---- Modification (nom / lien) ----
  if (body.op === "edit") {
    const name = (body.name || "").trim();
    const link = (body.link || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
    }
    const wish = await kv.hget(keyFor(member), wishId);
    if (!wish) {
      return NextResponse.json({ error: "Souhait introuvable" }, { status: 404 });
    }
    wish.name = name;
    wish.link = link;
    await kv.hset(keyFor(member), { [wishId]: wish });
    return NextResponse.json({ ok: true });
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
    // `on` (booléen) = état voulu explicite : indispensable pour rejouer une
    // réaction faite hors ligne sans risque d'inversion. Sans `on`, on bascule
    // (comportement d'origine).
    if (typeof body.on === "boolean") {
      reactions[reaction] = body.on
        ? who.includes(author)
          ? who
          : [...who, author]
        : who.filter((n) => n !== author);
    } else {
      reactions[reaction] = who.includes(author)
        ? who.filter((n) => n !== author)
        : [...who, author];
    }
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
  if (!checkPin(request)) return unauthorized();

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
