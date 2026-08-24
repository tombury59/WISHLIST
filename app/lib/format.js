import { MEMBER_COLORS } from "./members";

// « il y a X min / h / j », puis date courte au-delà d'une semaine.
export function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Ajoute https:// si l'utilisateur a saisi un lien sans protocole.
export function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return "https://" + url;
}

// Surcharges de couleur choisies par les membres (partagées, chargées au
// démarrage depuis /api/profile). Priment sur les couleurs par défaut.
let colorOverrides = {};
export function setColorOverrides(map) {
  colorOverrides = map && typeof map === "object" ? map : {};
}

// Couleur d'avatar d'un membre : surcharge choisie, sinon défaut, sinon gris.
export function avatarColor(name) {
  return colorOverrides[name] || MEMBER_COLORS[name] || "#3f3f46";
}

// Palette proposée dans « Mon compte » pour choisir sa couleur.
export const COLOR_PALETTE = [
  "#e5484d", // rouge
  "#f97316", // orange
  "#f5c518", // jaune
  "#22c55e", // vert
  "#14b8a6", // turquoise
  "#3b82f6", // bleu
  "#3515c3", // bleu foncé
  "#8b5cf6", // violet
  "#ec4899", // rose
  "#78716c", // taupe
];
