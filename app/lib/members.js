// La famille. L'ordre ici = l'ordre affiché dans l'appli.
export const MEMBERS = [
  "Lilou",
  "Sam",
  "Tom",
  "Théo",
  "Béné",
  "Denis",
  "Katell",
  "David",
  "Betty",
  "Ludivine",
];

export const MEMBER_NAMES = MEMBERS;

// Anciens prénoms -> nouveaux. Sert à migrer les données déjà enregistrées
// (base : scripts/migrate-renames.mjs ; navigateur : migrateLocalNames()).
export const RENAMED = { Maman: "Béné", Papa: "Denis" };

// Une couleur d'avatar par membre.
export const MEMBER_COLORS = {
  Lilou: "#e5484d", // rouge
  Sam: "#f5c518", // jaune
  Tom: "#3b82f6", // bleu
  Théo: "#f97316", // orange
  Béné: "#22c55e", // vert
  Denis: "#8b5cf6", // violet
  Katell: "#3515c3", // bleu foncé
  David: "#14b8a6", // turquoise
  Betty: "#ec4899", // rose
  Ludivine: "#a16207", // marron
};
