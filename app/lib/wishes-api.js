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

// Réordonne toute la liste d'un membre en un seul appel (le tableau `ids` est
// l'ordre final voulu). `keepalive` permet à l'envoi d'aboutir même si l'app
// se ferme / passe en arrière-plan juste après (flush de dernière seconde).
export function reorderWishes(pin, { member, ids }) {
  return request("/api/wishes", pin, {
    method: "PATCH",
    keepalive: true,
    body: JSON.stringify({ op: "reorder", member, ids }),
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
// `on` (optionnel) : état voulu explicite (true = poser, false = retirer).
// Fourni lors d'un rejeu depuis l'outbox pour rester idempotent ; absent = bascule.
export function setReaction(pin, { member, wishId, reaction, author, on }) {
  return request("/api/wishes", pin, {
    method: "PATCH",
    body: JSON.stringify({ member, wishId, reaction, author, on }),
  });
}

// ---- Historique ----
export function getHistory(pin) {
  return request("/api/history", pin);
}
