import { useEffect, useRef, useState } from "react";
import * as api from "../lib/wishes-api";
import { REORDER_BATCH_MS } from "../lib/constants";
import * as offline from "../lib/offline-store";
import * as outbox from "../lib/outbox";

// Données des souhaits + toutes les mutations. Les modifications sont
// appliquées immédiatement à l'écran (optimiste), puis envoyées.
//
// HORS LIGNE : seuls le réordonnancement et les réactions restent possibles ;
// ils sont mis en file (outbox, IndexedDB) et rejoués au retour du réseau. Les
// souhaits sont aussi mis en cache pour l'affichage et la reprise hors ligne.
//
// Le PIN est fourni par le parent et lu via une ref pour que les handlers
// aient toujours le code courant sans être recréés.
export function useWishes(pin) {
  const [wishes, setWishes] = useState({});
  const [pendingCount, setPendingCount] = useState(0); // modifs offline en attente
  const pinRef = useRef(pin);
  pinRef.current = pin;
  // Miroir de l'état, pour lire les réactions courantes sans dépendances.
  const wishesRef = useRef(wishes);
  wishesRef.current = wishes;

  async function refreshPending() {
    setPendingCount(await outbox.count());
  }

  // Rejoue la file d'attente (réactions + ordre). S'arrête à la 1re erreur
  // (toujours hors ligne) ; les entrées restantes seront retentées plus tard.
  async function flushOutbox() {
    for (const it of await outbox.all()) {
      try {
        if (it.kind === "reaction") {
          await api.setReaction(pinRef.current, {
            member: it.member,
            wishId: it.wishId,
            reaction: it.reaction,
            author: it.author,
            on: it.on,
          });
        } else if (it.kind === "reorder") {
          await api.reorderWishes(pinRef.current, { member: it.member, ids: it.ids });
        }
        await outbox.remove(it.key);
      } catch {
        break;
      }
    }
    await refreshPending();
  }

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
        api
          .reorderWishes(pinRef.current, { member, ids: pending[member] })
          .catch(async () => {
            // Hors ligne : on met l'ordre final en file pour un rejeu au retour.
            await outbox.enqueue({
              key: outbox.reorderKey(member),
              kind: "reorder",
              member,
              ids: pending[member],
            });
            await refreshPending();
          })
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

  // Au montage : hydrate depuis le cache (affichage instantané) puis, si en
  // ligne, rejoue la file. Écoute aussi le retour du réseau pour synchroniser.
  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await offline.getCachedWishes();
      if (alive && cached) {
        setWishes((prev) => (Object.keys(prev).length ? prev : cached));
      }
      await refreshPending();
      if (navigator.onLine) flushOutbox();
    })();
    const onOnline = async () => {
      await flushOutbox();
      await loadWishes(pinRef.current).catch(() => {});
    };
    window.addEventListener("online", onOnline);
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge tout (sert aussi à valider le code à la connexion). On envoie d'abord
  // l'ordre en attente pour ne pas récupérer une liste « pré-rangement ».
  // En cas d'échec RÉSEAU (hors ligne), on retombe sur le cache si le PIN
  // correspond à la dernière connexion en ligne ; une erreur 401 (mauvais code)
  // est propagée normalement.
  async function loadWishes(code) {
    await flushReorder();
    try {
      const data = await api.getWishes(code);
      setWishes(data.wishes || {});
      await offline.setCachedWishes(data.wishes || {});
      await offline.setPinHash(code);
    } catch (e) {
      if (e?.status === 401) throw e;
      const cached = await offline.getCachedWishes();
      if (cached && (await offline.matchPin(code))) {
        setWishes(cached);
        return;
      }
      throw e;
    }
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

  // Bascule une réaction du profil `me`. Mise à jour immédiate à l'écran, puis
  // envoi — ou mise en file si hors ligne. On calcule l'état voulu (`on`) avant
  // la mise à jour, pour un rejeu idempotent.
  function toggleReaction(member, wishId, reaction, me) {
    const cur = (wishesRef.current[member] || []).find((w) => w.id === wishId);
    const who = (cur?.reactions?.[reaction]) || [];
    const on = !who.includes(me);

    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) => {
        if (w.id !== wishId) return w;
        const reactions = { ...(w.reactions || {}) };
        const list = reactions[reaction] || [];
        const next = on ? [...list, me] : list.filter((n) => n !== me);
        if (next.length === 0) delete reactions[reaction];
        else reactions[reaction] = next;
        return { ...w, reactions };
      }),
    }));

    sendOrQueueReaction({ member, wishId, reaction, author: me, on });
  }

  // Envoie la réaction si possible, sinon la met en file (coalescée par
  // souhait/réaction/auteur : seul le dernier état est conservé).
  async function sendOrQueueReaction(p) {
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        await api.setReaction(pinRef.current, p);
        return;
      } catch {
        /* échec réseau -> on bascule en file */
      }
    }
    await outbox.enqueue({
      key: outbox.reactionKey(p.member, p.wishId, p.reaction, p.author),
      kind: "reaction",
      ...p,
    });
    await refreshPending();
  }

  // Vide le cache hors ligne (données mises en cache + file d'attente) puis,
  // si en ligne, recharge tout depuis le serveur.
  async function clearOfflineData() {
    await outbox.clear();
    await offline.clearWishesCache();
    setPendingCount(0);
    if (typeof navigator === "undefined" || navigator.onLine) {
      await loadWishes(pinRef.current).catch(() => {});
    }
  }

  return {
    wishes,
    pendingCount,
    clearOfflineData,
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
