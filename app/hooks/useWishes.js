import { useEffect, useRef, useState } from "react";
import * as api from "../lib/wishes-api";
import { REORDER_BATCH_MS } from "../lib/constants";

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

  // --- Batch du réordonnancement ---
  // `pendingOrder` : { membre -> tableau d'IDs final voulu }, en attente d'envoi.
  // `flushTimer`   : minuteur du regroupement (démarré au 1er déplacement).
  const pendingOrderRef = useRef({});
  const flushTimerRef = useRef(null);

  // Envoie tout de suite l'ordre en attente (1 appel par membre concerné) et
  // vide la file. Renvoie une promesse pour pouvoir attendre avant un rechargement.
  function flushReorder() {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const pending = pendingOrderRef.current;
    pendingOrderRef.current = {};
    const members = Object.keys(pending);
    if (members.length === 0) return Promise.resolve();
    return Promise.all(
      members.map((member) =>
        api.reorderWishes(pinRef.current, { member, ids: pending[member] }).catch(() => {})
      )
    );
  }

  // Applique un nouvel ordre à l'écran immédiatement, puis programme l'envoi
  // groupé. Appelé à chaque « drop » ; on ne stocke que l'état FINAL, donc
  // 10 déplacements = 1 seul appel.
  function reorderWishes(member, ids) {
    setWishes((prev) => {
      const cur = prev[member] || [];
      const byId = new Map(cur.map((w) => [w.id, w]));
      const next = ids.map((id) => byId.get(id)).filter(Boolean);
      // Sécurité : ré-ajoute en fin tout souhait absent de `ids`.
      for (const w of cur) if (!ids.includes(w.id)) next.push(w);
      return { ...prev, [member]: next };
    });
    pendingOrderRef.current[member] = ids;
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushReorder();
      }, REORDER_BATCH_MS);
    }
  }

  // Vide la file quand l'app se ferme ou passe en arrière-plan (mobile),
  // sinon un rangement fait dans les 10 s serait perdu. `keepalive` (côté API)
  // laisse l'envoi aboutir même pendant la fermeture.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushReorder();
    };
    window.addEventListener("pagehide", flushReorder);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushReorder);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge tout (sert aussi à valider le code à la connexion). On envoie d'abord
  // l'ordre en attente pour ne pas récupérer une liste « pré-rangement ».
  async function loadWishes(code) {
    await flushReorder();
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
    reorderWishes,
    flushReorder,
  };
}
