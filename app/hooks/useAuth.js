import { useEffect, useRef, useState } from "react";
import { INACTIVITY_MS, REFRESH_MS, STORAGE } from "../lib/constants";

// Écran du code (PIN) et cycle de session : connexion, restauration de la
// session, clavier physique, rafraîchissement auto et déconnexion sur
// inactivité.
//
// `pin` / `setPin` sont possédés par le parent (partagés avec useWishes).
// `loadWishes(code)` charge les souhaits et sert à valider le code.
// `onLogout` permet au parent de nettoyer son état transitoire (modales…).
export function useAuth({ pin, setPin, loadWishes, onLogout }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Refs vers l'état / les handlers courants, pour que les écouteurs
  // d'événements (abonnés une seule fois) restent à jour sans se réabonner.
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const loadRef = useRef(loadWishes);
  loadRef.current = loadWishes;

  function pushDigit(d) {
    setError("");
    setPin((p) => (p.length < 12 ? p + d : p));
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  async function tryLogin(code) {
    if (!code || loading) return;
    setLoading(true);
    setError("");
    try {
      await loadRef.current(code);
      sessionStorage.setItem(STORAGE.pin, code);
      setAuthed(true);
    } catch {
      sessionStorage.removeItem(STORAGE.pin);
      setAuthed(false);
      setError("Code incorrect");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  // Déconnexion : on revient à l'écran du code, ce qui stoppe aussi le
  // rafraîchissement auto. Le parent nettoie ses modales via onLogout.
  function logout() {
    sessionStorage.removeItem(STORAGE.pin);
    setAuthed(false);
    setPin("");
    setError("");
    onLogout?.();
  }

  // Handlers exposés via ref pour les écouteurs globaux (clavier, inactivité).
  const handlersRef = useRef({});
  handlersRef.current = { pushDigit, backspace, tryLogin, logout };

  // Restauration de la session au chargement.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE.pin);
    if (saved) {
      setPin(saved);
      handlersRef.current.tryLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Le clavier physique de l'écran du code est géré par le composant PinPad.)

  // Synchronisation auto : on recharge régulièrement pour voir les ajouts
  // des autres, sans rafraîchir la page à la main.
  useEffect(() => {
    if (!authed) return;
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadRef.current(pinRef.current).catch(() => {});
      }
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authed]);

  // Minuteur d'inactivité : chaque interaction le remet à zéro.
  useEffect(() => {
    if (!authed) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => handlersRef.current.logout(), INACTIVITY_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [authed]);

  return { authed, loading, error, pushDigit, backspace, tryLogin, logout };
}
