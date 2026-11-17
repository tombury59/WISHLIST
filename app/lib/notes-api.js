// Notes perso (une page par membre). Le PIN famille autorise chaque appel.
import { request } from "./http";

export function getNotes(pin, member) {
  return request(`/api/notes?member=${encodeURIComponent(member)}`, pin);
}

export function saveNotes(pin, { member, text }) {
  return request("/api/notes", pin, {
    method: "PUT",
    body: JSON.stringify({ member, text }),
  });
}
