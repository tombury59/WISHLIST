import { NextResponse } from "next/server";
import { kv } from "../../lib/kv";

export const dynamic = "force-dynamic";

const FAMILY_PIN = process.env.FAMILY_PIN || "1234";
const HISTORY_KEY = "history";

function checkPin(request) {
  const pin = request.headers.get("x-family-pin");
  return pin && pin === FAMILY_PIN;
}

// GET /api/history  -> les 200 dernières actions (plus récentes d'abord)
export async function GET(request) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }
  const items = await kv.lrange(HISTORY_KEY, 0, 199);
  return NextResponse.json({ history: items || [] });
}
