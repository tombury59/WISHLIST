import { useEffect, useState } from "react";
import { detectPlatform, isStandalone } from "../lib/install";

// État d'installation de l'appli sur cet appareil.
//
// Sur Chrome / Edge / Android, le navigateur peut proposer sa propre fenêtre
// d'installation (`beforeinstallprompt`) : on la met de côté pour l'ouvrir
// d'un seul bouton. L'événement arrive souvent avant que React soit prêt ; un
// petit script dans le layout le capture dans `window.__bip` (voir layout.js).
export function useInstall() {
  const [platform, setPlatform] = useState(null); // null tant qu'on n'a pas détecté
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    if (window.__bip) setPromptEvent(window.__bip);

    const onReady = () => setPromptEvent(window.__bip || null);
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      window.__bip = null;
    };
    window.addEventListener("bip-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Ouvre la fenêtre d'installation du navigateur. Renvoie true si acceptée.
  async function promptInstall() {
    const evt = promptEvent;
    if (!evt) return false;
    try {
      evt.prompt();
      const { outcome } = await evt.userChoice;
      // L'événement n'est utilisable qu'une fois.
      setPromptEvent(null);
      window.__bip = null;
      if (outcome === "accepted") setInstalled(true);
      return outcome === "accepted";
    } catch {
      return false;
    }
  }

  return { platform, installed, canPrompt: Boolean(promptEvent), promptInstall };
}
