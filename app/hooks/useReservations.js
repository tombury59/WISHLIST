import { useEffect, useRef, useState } from "react";
import * as api from "../lib/wishes-api";

// Réservations de cadeaux, vues par le profil `me`.
//
// Le serveur exclut toujours la liste de `me` : on ne reçoit donc jamais ce qui
// est réservé chez soi. L'état reste en mémoire uniquement (ni IndexedDB ni
// localStorage) et est vidé à chaque changement de profil, pour qu'un appareil
// partagé ne garde rien que le profil suivant pourrait voir.
//
// Forme : { <membre>: { <wishId>: { by, at } } }
export function useReservations(pin, me, enabled) {
  const [reservations, setReservations] = useState({});
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const meRef = useRef(me);
  meRef.current = me;

  async function reload() {
    const viewer = meRef.current;
    if (!viewer) return;
    try {
      const data = await api.getReservations(pinRef.current, viewer);
      // Ignore une réponse arrivée après un changement de profil.
      if (meRef.current === viewer) setReservations(data.reservations || {});
    } catch {
      /* hors ligne : on garde ce qu'on a */
    }
  }

  useEffect(() => {
    setReservations({});
    if (enabled && me) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, enabled]);

  function setOne(member, wishId, value) {
    setReservations((prev) => {
      const forMember = { ...(prev[member] || {}) };
      if (value) forMember[wishId] = value;
      else delete forMember[wishId];
      return { ...prev, [member]: forMember };
    });
  }

  // Réserve (affichage immédiat). Si quelqu'un a été plus rapide (409) ou en
  // cas d'erreur, on recharge pour afficher l'état réel. Renvoie true si la
  // réservation est bien enregistrée.
  async function reserve(member, wishId) {
    const by = meRef.current;
    if (!by || by === member) return false;
    setOne(member, wishId, { by, at: Date.now() });
    try {
      await api.reserveWish(pinRef.current, { member, wishId, by });
      return true;
    } catch {
      setOne(member, wishId, null);
      await reload();
      return false;
    }
  }

  async function unreserve(member, wishId) {
    const by = meRef.current;
    if (!by) return;
    const previous = reservations[member]?.[wishId] || null;
    setOne(member, wishId, null);
    try {
      await api.unreserveWish(pinRef.current, { member, wishId, by });
    } catch {
      setOne(member, wishId, previous);
      await reload();
    }
  }

  return { reservations, reload, reserve, unreserve };
}
