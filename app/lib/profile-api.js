// Préférences de profil partagées (couleur d'avatar). Le PIN famille autorise
// chaque appel.
import { request } from "./http";

export function getColors(pin) {
  return request("/api/profile", pin);
}

export function setColor(pin, { member, color }) {
  return request("/api/profile", pin, {
    method: "POST",
    body: JSON.stringify({ action: "color", member, color }),
  });
}
