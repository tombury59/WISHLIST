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
}

// Déverrouille par la biométrie et renvoie le membre reconnu. Lève une erreur
// si l'utilisateur annule ou si aucune clé n'existe sur l'appareil.
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
