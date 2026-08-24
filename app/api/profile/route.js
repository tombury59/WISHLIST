import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";
import { kv } from "../../lib/kv";
import { checkPin, unauthorized } from "../_lib/auth";

export const dynamic = "force-dynamic";

// Préférences de profil partagées (pour l'instant : la couleur d'avatar choisie
// par chacun). Stockées dans un hash KV `member -> #couleur`, autorisées par le
// PIN famille.
const COLORS_KEY = "member-colors";
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// GET /api/profile -> { colors: { member: "#hex" } }
export async function GET(request) {
  if (!checkPin(request)) return unauthorized();
  const colors = (await kv.hgetall(COLORS_KEY)) || {};
  return NextResponse.json({ colors });
}

// POST /api/profile { action: "color", member, color }
export async function POST(request) {
  if (!checkPin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  if (body.action === "color") {
    const member = (body.member || "").trim();
    const color = (body.color || "").trim();
    if (!MEMBER_NAMES.includes(member)) {
      return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
    }
    if (!HEX.test(color)) {
      return NextResponse.json({ error: "Couleur invalide" }, { status: 400 });
    }
    await kv.hset(COLORS_KEY, { [member]: color });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
