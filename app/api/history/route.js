import { NextResponse } from "next/server";
import { kv } from "../../lib/kv";
import { checkPin, unauthorized } from "../_lib/auth";
import { HISTORY_KEY } from "../_lib/history";

export const dynamic = "force-dynamic";

// GET /api/history  -> les 200 dernières actions (plus récentes d'abord)
export async function GET(request) {
  if (!checkPin(request)) return unauthorized();
  const items = await kv.lrange(HISTORY_KEY, 0, 199);
  return NextResponse.json({ history: items || [] });
}
