// Réservations de cadeaux.
//
// Stockées À PART des souhaits : ainsi /api/wishes, le cache hors ligne et
// l'historique ne contiennent jamais d'info de réservation, et la personne dont
// c'est la liste ne peut pas la recevoir par accident.
//
// UN SEUL hash pour toute la famille (champ `<membre>:<wishId>` -> { by, at }) :
// lire toutes les réservations coûte donc 1 seule commande, au lieu d'une par
// membre (la base est limitée en nombre de requêtes).
export const RESERVED_KEY = "reserved";

export function reservedField(member, wishId) {
  return `${member}:${wishId}`;
}
