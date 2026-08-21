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

// Couleur d'avatar attribuée à chaque membre (repli gris si inconnu).
export function avatarColor(name) {
  return MEMBER_COLORS[name] || "#3f3f46";
}
