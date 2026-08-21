// Couche d'accès HTTP côté client aux codes PIN par utilisateur. `pin` = code
// famille (validé côté serveur) ; `code` = code du profil concerné.
import { request } from "./http";

// { set: { member: bool } } — quels profils ont déjà un code.
export function getPinStatus(pin) {
  return request("/api/pins", pin);
}

// Définit le code d'un profil (1re fois). Lève une erreur .status === 409 si un
// code a déjà été défini entre-temps (course entre deux appareils).
export function setUserPin(pin, { member, code }) {
  return request("/api/pins", pin, {
    method: "POST",
    body: JSON.stringify({ member, pin: code, action: "set" }),
  });
}

// Vérifie le code d'un profil -> { ok: boolean }.
export function verifyUserPin(pin, { member, code }) {
  return request("/api/pins", pin, {
    method: "POST",
    body: JSON.stringify({ member, pin: code, action: "verify" }),
  });
}
