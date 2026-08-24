import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { MEMBER_NAMES } from "../../lib/members";
import { kv } from "../../lib/kv";
import { checkPin, unauthorized } from "../_lib/auth";
import { newId } from "../_lib/history";

export const dynamic = "force-dynamic";

// Déverrouillage biométrique (WebAuthn / passkeys). La biométrie remplace le
// CODE DE PROFIL : elle relie, sur cet appareil, une clé à un membre. Le PIN
// famille (en-tête `x-family-pin`) autorise toujours ces appels — pas de
// session serveur. La clé privée reste dans l'appareil ; seule la clé publique
// est stockée ici.

// Hash KV : credentialId -> { member, publicKey(base64url), counter, ... }.
const CREDS_KEY = "webauthn-creds";
// Défis à usage unique, avec expiration.
const CHAL_PREFIX = "webauthn-chal:";
const CHALLENGE_TTL = 300; // secondes
const RP_NAME = "Liste de souhaits";

// rpID (domaine, sans port) et origine attendue, déduits de la requête.
// localhost en dev, le domaine Vercel en prod.
function rp(request) {
  const host = request.headers.get("host") || "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}

const b64 = {
  from: (u8) => Buffer.from(u8).toString("base64url"),
  to: (s) => Buffer.from(s, "base64url"),
};

async function saveChallenge(challenge, extra) {
  const id = newId();
  await kv.set(CHAL_PREFIX + id, { challenge, ...extra }, { ex: CHALLENGE_TTL });
  return id;
}

// Lit puis supprime le défi (usage unique).
async function takeChallenge(id) {
  if (!id) return null;
  const data = await kv.get(CHAL_PREFIX + id);
  if (data) {
    try {
      await kv.del(CHAL_PREFIX + id);
    } catch {
      /* best-effort : le TTL nettoiera de toute façon */
    }
  }
  return data;
}

export async function POST(request) {
  if (!checkPin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const { rpID, origin } = rp(request);

  // ---- Enrôlement : options ----
  if (action === "register-options") {
    const member = (body.member || "").trim();
    if (!MEMBER_NAMES.includes(member)) {
      return NextResponse.json({ error: "Membre inconnu" }, { status: 400 });
    }
    const all = (await kv.hgetall(CREDS_KEY)) || {};
    const excludeCredentials = Object.entries(all)
      .filter(([, c]) => c.member === member)
      .map(([id, c]) => ({ id, transports: c.transports || undefined }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: member,
      userDisplayName: member,
      userID: new TextEncoder().encode(member),
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "required", // clé « découvrable » -> connexion sans choisir le profil
        userVerification: "required", // impose la biométrie
      },
    });
    const challengeId = await saveChallenge(options.challenge, { member });
    return NextResponse.json({ options, challengeId });
  }

  // ---- Enrôlement : vérification + stockage ----
  if (action === "register-verify") {
    const member = (body.member || "").trim();
    const stored = await takeChallenge(body.challengeId);
    if (!stored || stored.member !== member) {
      return NextResponse.json({ error: "Défi invalide" }, { status: 400 });
    }
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch {
      return NextResponse.json({ error: "Vérification échouée" }, { status: 400 });
    }
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ verified: false }, { status: 400 });
    }
    const { credential } = verification.registrationInfo;
    await kv.hset(CREDS_KEY, {
      [credential.id]: {
        member,
        publicKey: b64.from(credential.publicKey),
        counter: credential.counter || 0,
        transports: credential.transports || [],
        device: (body.device || "").slice(0, 80),
        createdAt: Date.now(),
      },
    });
    return NextResponse.json({ verified: true });
  }

  // ---- Connexion : options (credential découvrable) ----
  if (action === "login-options") {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: [], // le navigateur propose les clés de l'appareil
    });
    const challengeId = await saveChallenge(options.challenge, {});
    return NextResponse.json({ options, challengeId });
  }

  // ---- Connexion : vérification -> renvoie le membre ----
  if (action === "login-verify") {
    const stored = await takeChallenge(body.challengeId);
    if (!stored) {
      return NextResponse.json({ error: "Défi invalide" }, { status: 400 });
    }
    const credId = body.response?.id;
    const all = (await kv.hgetall(CREDS_KEY)) || {};
    const cred = credId ? all[credId] : null;
    if (!cred) {
      return NextResponse.json({ error: "Clé inconnue" }, { status: 400 });
    }
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: credId,
          publicKey: b64.to(cred.publicKey),
          counter: cred.counter || 0,
          transports: cred.transports || [],
        },
      });
    } catch {
      return NextResponse.json({ error: "Vérification échouée" }, { status: 400 });
    }
    if (!verification.verified) {
      return NextResponse.json({ verified: false }, { status: 400 });
    }
    // Met à jour le compteur anti-rejeu.
    await kv.hset(CREDS_KEY, {
      [credId]: { ...cred, counter: verification.authenticationInfo.newCounter },
    });
    return NextResponse.json({ verified: true, member: cred.member });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
