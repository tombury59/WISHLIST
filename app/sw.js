import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

// Service worker (généré par Serwist). Il précache la coquille de l'app (HTML,
// JS, CSS, icônes) pour qu'elle s'ouvre HORS LIGNE, et applique un cache
// runtime par défaut. Les appels `/api/*` ne sont PAS cachés ici : les données
// sont gérées côté application (cache IndexedDB + file d'attente).
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
