// Accès client au déverrouillage biométrique (WebAuthn). Le PIN famille (`pin`)
// autorise chaque appel, comme le reste de l'API. La biométrie remplace le
// code de profil : elle relie une clé de l'appareil à un membre.
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { request } from "./http";

// L'appareil a-t-il un authentificateur biométrique intégré (Face ID, Touch ID,
// empreinte, Windows Hello) ?
export async function isBiometricAvailable() {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Enrôle le profil `member` sur CET appareil (à faire une fois, connecté).
// Renvoie l'ID de la clé créée, à mémoriser localement pour le déverrouillage
// hors ligne.
export async function registerBiometric(pin, member) {
  const { options, challengeId } = await request("/api/webauthn", pin, {
    method: "POST",
    body: JSON.stringify({ action: "register-options", member }),
  });
  const response = await startRegistration({ optionsJSON: options });
  await request("/api/webauthn", pin, {
    method: "POST",
    body: JSON.stringify({
      action: "register-verify",
      member,
      challengeId,
      response,
      device: typeof navigator !== "undefined" ? navigator.userAgent : "",
    }),
  });
  return response.id; // credentialID (base64url)
}

// Déverrouille par la biométrie EN LIGNE : le serveur fournit le défi et vérifie
// la signature, puis renvoie le membre. Lève si annulé / aucune clé.
export async function loginBiometric(pin) {
  const { options, challengeId } = await request("/api/webauthn", pin, {
    method: "POST",
    body: JSON.stringify({ action: "login-options" }),
  });
  const response = await startAuthentication({ optionsJSON: options });
  const { member } = await request("/api/webauthn", pin, {
    method: "POST",
    body: JSON.stringify({ action: "login-verify", challengeId, response }),
  });
  return member;
}

// Déverrouille par la biométrie HORS LIGNE, sans serveur : on déclenche quand
// même le capteur (le prompt est local), puis on fait confiance au résultat
// localement (pas de vérification serveur — le PIN famille reste la vraie
// barrière). `creds` = [{ id, member }] mémorisés à l'enrôlement.
export async function loginBiometricLocal(creds) {
  const usable = (creds || []).filter((c) => c && c.id);
  if (usable.length === 0) {
    const err = new Error("no-local-credential");
    err.name = "NoLocalCredential";
    throw err;
  }
  const challenge = new Uint8Array(16);
  crypto.getRandomValues(challenge);
  const b64Challenge = btoa(String.fromCharCode(...challenge))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await startAuthentication({
    optionsJSON: {
      challenge: b64Challenge,
      rpId: window.location.hostname,
      allowCredentials: usable.map((c) => ({ id: c.id, type: "public-key" })),
      userVerification: "required",
      timeout: 60000,
    },
  });
  const match = usable.find((c) => c.id === response.id);
  if (!match) {
    const err = new Error("unknown-credential");
    err.name = "NoLocalCredential";
    throw err;
  }
  return match.member;
}
