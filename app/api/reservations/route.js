import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";
import { kv } from "../../lib/kv";
import { checkPin, unauthorized } from "../_lib/auth";
import { RESERVED_KEY, reservedField } from "../_lib/reservations";

export const dynamic = "force-dynamic";

function bad(error, status = 400) {
  return NextResponse.json({ error }, { status });
}

// GET /api/reservations?viewer=<profil>
//   -> { reservations: { <membre>: { <wishId>: { by, at } } } }
//
// La liste du `viewer` lui-même est TOUJOURS exclue côté serveur : il ne reçoit
// aucune donnée sur ce qui est réservé chez lui (la surprise reste entière,
// même en regardant le réseau ou le cache de son appareil).
export async function GET(request) {
  if (!checkPin(request)) return unauthorized();

  const viewer = (new URL(request.url).searchParams.get("viewer") || "").trim();
  if (!MEMBER_NAMES.includes(viewer)) return bad("Profil inconnu");

  // 1 seule commande pour toute la famille.
  const all = (await kv.hgetall(RESERVED_KEY)) || {};
  const result = {};
  for (const [field, value] of Object.entries(all)) {
    const sep = field.indexOf(":");
    const member = field.slice(0, sep);
    if (sep < 0 || member === viewer) continue;
    (result[member] ||= {})[field.slice(sep + 1)] = value;
  }
  return NextResponse.json({ reservations: result });
}

// POST /api/reservations  { member, wishId, by }  -> réserve un cadeau
//   - impossible sur sa propre liste ;
//   - un seul réservant par cadeau (409 si quelqu'un d'autre l'a déjà pris).
// Pas d'entrée d'historique : l'historique est visible par tout le monde.
export async function POST(request) {
  if (!checkPin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const wishId = (body.wishId || "").trim();
  const by = (body.by || "").trim();

  if (!MEMBER_NAMES.includes(member) || !MEMBER_NAMES.includes(by) || !wishId) {
    return bad("Requête invalide");
  }
  if (by === member) return bad("Impossible de réserver sur sa propre liste", 403);

  const wish = await kv.hget(`wishes:${member}`, wishId);
  if (!wish) return bad("Souhait introuvable", 404);
  if (wish.disabled) return bad("Souhait désactivé", 409);

  const reservation = { by, at: Date.now() };
  // HSETNX : atomique, donc si deux personnes réservent en même temps, une
  // seule gagne.
  const field = reservedField(member, wishId);
  const created = await kv.hsetnx(RESERVED_KEY, field, reservation);
  if (!created) {
    const existing = await kv.hget(RESERVED_KEY, field);
    if (existing && existing.by !== by) {
      return NextResponse.json(
        { error: "Déjà réservé", reservation: existing },
        { status: 409 }
      );
    }
    return NextResponse.json({ reservation: existing || reservation });
  }
  return NextResponse.json({ reservation });
}

// DELETE /api/reservations  { member, wishId, by }  -> annule SA réservation
export async function DELETE(request) {
  if (!checkPin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const wishId = (body.wishId || "").trim();
  const by = (body.by || "").trim();

  if (!MEMBER_NAMES.includes(member) || !wishId || !by) {
    return bad("Requête invalide");
  }

  const field = reservedField(member, wishId);
  const existing = await kv.hget(RESERVED_KEY, field);
  if (existing && existing.by !== by) {
    return bad("Ce cadeau est réservé par quelqu'un d'autre", 403);
  }
  if (existing) await kv.hdel(RESERVED_KEY, field);
  return NextResponse.json({ ok: true });
}
