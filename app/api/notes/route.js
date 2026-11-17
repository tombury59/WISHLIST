import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";
import { kv } from "../../lib/kv";
import { checkPin, unauthorized } from "../_lib/auth";

export const dynamic = "force-dynamic";

// Notes perso : une grande page par membre, que lui seul affiche dans l'appli.
// Tout tient dans un seul hash KV `notes` (champ = membre, valeur = { text, at }).
// Coût : 1 commande pour lire, 1 pour enregistrer (pas d'enregistrement auto).
const NOTES_KEY = "notes";
const NOTES_MAX = 10000; // caractères (≈ 10 Ko par personne au plus)

// GET /api/notes?member=X -> { text, at }
export async function GET(request) {
  if (!checkPin(request)) return unauthorized();
  const member = new URL(request.url).searchParams.get("member") || "";
  if (!MEMBER_NAMES.includes(member)) {
    return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
  }
  const note = await kv.hget(NOTES_KEY, member);
  return NextResponse.json({ text: note?.text || "", at: note?.at || null });
}

// PUT /api/notes { member, text } -> { at }
export async function PUT(request) {
  if (!checkPin(request)) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const member = body.member || "";
  const text = typeof body.text === "string" ? body.text : null;
  if (!MEMBER_NAMES.includes(member)) {
    return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
  }
  if (text === null || text.length > NOTES_MAX) {
    return NextResponse.json({ error: "Note trop longue" }, { status: 400 });
  }
  // Page vide : on supprime le champ plutôt que de stocker du vide.
  if (!text.trim()) {
    await kv.hdel(NOTES_KEY, member);
    return NextResponse.json({ at: null });
  }
  const at = Date.now();
  await kv.hset(NOTES_KEY, { [member]: { text, at } });
  return NextResponse.json({ at });
}
