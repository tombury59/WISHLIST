// Réglages transverses de l'appli, regroupés en un seul endroit.

// Déconnexion automatique après 15 min sans activité (revient à l'écran du code).
export const INACTIVITY_MS = 15 * 60 * 1000;

// Délai minimal entre deux actualisations manuelles des souhaits.
export const REFRESH_COOLDOWN_MS = 8000;

// Réordonnancement (glisser-déposer) : on regroupe tous les déplacements faits
// dans cette fenêtre en UN SEUL appel API (économie de requêtes). Le compteur
// démarre au 1er déplacement et l'envoi part au plus tard après ce délai.
export const REORDER_BATCH_MS = 10000;

// « Petit écran ? » — aligné sur le breakpoint CSS (820px).
export const MOBILE_QUERY = "(max-width: 819px)";

// Clés de stockage navigateur.
export const STORAGE = {
  pin: "family-pin", // sessionStorage : code de la session en cours
  me: "family-me", // localStorage : profil choisi sur cet appareil
  view: "family-view", // localStorage : mode d'affichage (list / carousel)
  biometric: "family-biometric", // localStorage : profils enrôlés (biométrie) sur cet appareil
};
