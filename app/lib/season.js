"use client";

import { useSyncExternalStore } from "react";

// Clovis de saison : certaines poses changent de tenue selon la date.
// Tout se décide dans le navigateur (aucune requête).
//
//   Noël       : 1er → 26 décembre
//   Nouvel An  : 27 décembre → 2 janvier (images « 2027 » : seulement ce passage-là)
//   Halloween  : 25 → 31 octobre
//
// Aperçu : ajouter `?clovis=noel` (ou nouvel-an, halloween, aucune) à l'adresse.
// Le choix reste actif jusqu'à la fermeture de l'onglet.

export const SEASONS = ["noel", "nouvel-an", "halloween"];
// Poses qui ont une version de saison (même cadre que la version normale).
export const SEASONAL_POSES = new Set(["bord", "coucou", "sieste"]);
// Année inscrite sur les lunettes du Nouvel An.
const NEW_YEAR_IMAGE = 2027;
const PREVIEW_KEY = "family-clovis-preview";

export function seasonFor(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 && d <= 26) return "noel";
  const newYear = m === 12 && d >= 27 ? date.getFullYear() + 1 : m === 1 && d <= 2 ? date.getFullYear() : null;
  if (newYear) return newYear === NEW_YEAR_IMAGE ? "nouvel-an" : null;
  if (m === 10 && d >= 25) return "halloween";
  return null;
}

let cached; // calculé une fois par chargement de page
function currentSeason() {
  if (cached !== undefined) return cached;
  let preview = null;
  try {
    const q = new URLSearchParams(window.location.search).get("clovis");
    if (q !== null) sessionStorage.setItem(PREVIEW_KEY, q);
    preview = sessionStorage.getItem(PREVIEW_KEY);
  } catch {
    /* stockage indisponible : pas d'aperçu */
  }
  if (preview === "aucune") cached = null;
  else if (SEASONS.includes(preview)) cached = preview;
  else cached = seasonFor();
  return cached;
}

const noop = () => () => {};
// Saison en cours (null hors saison). Côté serveur et au tout premier rendu :
// null, puis la vraie valeur juste après (évite les écarts d'hydratation).
export function useSeason() {
  return useSyncExternalStore(noop, currentSeason, () => null);
}

// Image d'une pose, en tenue de saison si elle existe.
export function clovisSrc(pose, season) {
  return season && SEASONAL_POSES.has(pose)
    ? `/clovis/clovis-${pose}-${season}.png`
    : `/clovis/clovis-${pose}.png`;
}

// Cadre commun des poses de saison (taille du PNG) et marge transparente
// au-dessus de la version normale (place des chapeaux), en fraction.
export const FRAMES = {
  bord: { size: [460, 452], factor: 1.2573, top: 0.4259 },
  coucou: { size: [460, 683], factor: 1.0414, top: 0.3371 },
  sieste: { size: [460, 418], factor: 1.1058, top: 0.0348 },
};
