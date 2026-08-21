// Réglages transverses de l'appli, regroupés en un seul endroit.

// Déconnexion automatique après 15 min sans activité (revient à l'écran du code).
export const INACTIVITY_MS = 15 * 60 * 1000;

// Délai minimal entre deux actualisations manuelles des souhaits.
export const REFRESH_COOLDOWN_MS = 8000;

// « Petit écran ? » — aligné sur le breakpoint CSS (820px).
export const MOBILE_QUERY = "(max-width: 819px)";

// Clés de stockage navigateur.
export const STORAGE = {
  pin: "family-pin", // sessionStorage : code de la session en cours
  me: "family-me", // localStorage : profil choisi sur cet appareil
  highlights: "family-highlights", // localStorage : objets mis en évidence
  view: "family-view", // localStorage : mode d'affichage (list / carousel)
};
