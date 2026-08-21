// Couche d'accès HTTP côté client aux souhaits, commentaires, réactions et
// historique. Le code famille (`pin`) valide chaque appel (et la connexion).
import { request } from "./http";

// ---- Souhaits ----
export function getWishes(pin) {
  return request("/api/wishes", pin);
}

export function createWish(pin, { member, name, link }) {
  return request("/api/wishes", pin, {
    method: "POST",
    body: JSON.stringify({ member, name, link }),
  });
}

export function editWish(pin, { member, wishId, name, link }) {
  return request("/api/wishes", pin, {
    method: "PATCH",
    body: JSON.stringify({ op: "edit", member, wishId, name, link }),
  });
}

export function removeWish(pin, { member, id }) {
  return request("/api/wishes", pin, {
    method: "DELETE",
    body: JSON.stringify({ member, id }),
  });
}

// ---- Commentaires ----
export function addComment(pin, { member, wishId, text, author }) {
  return request("/api/wishes", pin, {
    method: "PATCH",
    body: JSON.stringify({ member, wishId, text, author }),
  });
}

export function removeComment(pin, { member, wishId, commentId }) {
  return request("/api/wishes", pin, {
    method: "DELETE",
    body: JSON.stringify({ member, wishId, commentId }),
  });
}

// ---- Réactions ----
export function setReaction(pin, { member, wishId, reaction, author }) {
  return request("/api/wishes", pin, {
    method: "PATCH",
    body: JSON.stringify({ member, wishId, reaction, author }),
  });
}

// ---- Historique ----
export function getHistory(pin) {
  return request("/api/history", pin);
}
