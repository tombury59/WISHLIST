import { useRef, useState } from "react";
import * as api from "../lib/wishes-api";

// Données des souhaits + toutes les mutations. Les modifications sont
// appliquées immédiatement à l'écran (optimiste) ; la synchro périodique
// (voir useAuth) propage ensuite aux autres appareils.
//
// Le PIN est fourni par le parent et lu via une ref pour que les handlers
// aient toujours le code courant sans être recréés.
export function useWishes(pin) {
  const [wishes, setWishes] = useState({});
  const pinRef = useRef(pin);
  pinRef.current = pin;

  // Charge tout (sert aussi à valider le code à la connexion).
  async function loadWishes(code) {
    const data = await api.getWishes(code);
    setWishes(data.wishes || {});
  }

  async function addWish(member, name, link) {
    const { wish } = await api.createWish(pinRef.current, { member, name, link });
    setWishes((prev) => ({
      ...prev,
      [member]: [...(prev[member] || []), wish],
    }));
  }

  // Modifie le nom / lien d'un souhait (mise à jour immédiate puis envoi).
  function editWish(member, wishId, name, link) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) =>
        w.id === wishId ? { ...w, name, link } : w
      ),
    }));
    api.editWish(pinRef.current, { member, wishId, name, link }).catch(() => {});
  }

  async function deleteWish(member, id) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).filter((w) => w.id !== id),
    }));
    await api.removeWish(pinRef.current, { member, id }).catch(() => {});
  }

  async function addComment(member, wishId, text, author) {
    const { comment } = await api.addComment(pinRef.current, {
      member,
      wishId,
      text,
      author,
    });
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) =>
        w.id === wishId ? { ...w, comments: [...(w.comments || []), comment] } : w
      ),
    }));
  }

  async function deleteComment(member, wishId, commentId) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) =>
        w.id === wishId
          ? { ...w, comments: (w.comments || []).filter((c) => c.id !== commentId) }
          : w
      ),
    }));
    await api
      .removeComment(pinRef.current, { member, wishId, commentId })
      .catch(() => {});
  }

  // Bascule une réaction du profil `me` sur un souhait. Mise à jour immédiate
  // à l'écran puis envoi ; on ne relit rien.
  function toggleReaction(member, wishId, reaction, me) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) => {
        if (w.id !== wishId) return w;
        const reactions = { ...(w.reactions || {}) };
        const who = reactions[reaction] || [];
        const next = who.includes(me)
          ? who.filter((n) => n !== me)
          : [...who, me];
        if (next.length === 0) delete reactions[reaction];
        else reactions[reaction] = next;
        return { ...w, reactions };
      }),
    }));
    api
      .setReaction(pinRef.current, { member, wishId, reaction, author: me })
      .catch(() => {});
  }

  return {
    wishes,
    loadWishes,
    addWish,
    editWish,
    deleteWish,
    addComment,
    deleteComment,
    toggleReaction,
  };
}
