import { NextResponse } from "next/server";
import { MEMBER_NAMES } from "../../lib/members";
import { checkPin, unauthorized } from "../_lib/auth";
import { getPinStatus, hasPin, setPin, verifyPin } from "../_lib/pins";

export const dynamic = "force-dynamic";

// GET /api/pins  -> quels profils ont déjà un code défini (sans révéler le code)
export async function GET(request) {
  if (!checkPin(request)) return unauthorized();

  const status = await getPinStatus();
  const set = {};
  for (const m of MEMBER_NAMES) set[m] = Boolean(status[m]);
  return NextResponse.json({ set });
}

// POST /api/pins
//   { member, pin, action: "set" }     -> définit le code (1re fois seulement)
//   { member, pin, action: "verify" }  -> vérifie le code -> { ok }
export async function POST(request) {
  if (!checkPin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const member = (body.member || "").trim();
  const pin = (body.pin || "").trim();
  const action = body.action;

  if (!MEMBER_NAMES.includes(member)) {
    return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
  }
  if (!/^\d{4,12}$/.test(pin)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 });
  }

  if (action === "set") {
    // Refuse d'écraser un code déjà défini (course entre deux appareils).
    if (await hasPin(member)) {
      return NextResponse.json({ error: "Code déjà défini" }, { status: 409 });
    }
    await setPin(member, pin);
    return NextResponse.json({ ok: true });
  }

  // Changement de code depuis « Mon compte » (l'utilisateur est déjà connecté à
  // son profil) : on écrase sans exiger l'ancien code.
  if (action === "update") {
    await setPin(member, pin);
    return NextResponse.json({ ok: true });
  }

  if (action === "verify") {
    const ok = await verifyPin(member, pin);
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
