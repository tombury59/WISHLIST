import { NextResponse } from "next/server";

// Code famille attendu (défini côté serveur). Repli "1234" en local.
const FAMILY_PIN = process.env.FAMILY_PIN || "1234";

// Vrai si la requête porte le bon code dans l'en-tête `x-family-pin`.
export function checkPin(request) {
  const pin = request.headers.get("x-family-pin");
  return Boolean(pin && pin === FAMILY_PIN);
}

// Réponse standard quand le code est absent ou incorrect.
export function unauthorized() {
  return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
}
