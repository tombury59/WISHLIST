import { useEffect, useRef, useState } from "react";
import { STORAGE } from "../lib/constants";

// Écran du code (PIN) et cycle de session : connexion, restauration de la
// session et déconnexion sur inactivité.
//
// `setPin` est possédé par le parent (partagé avec useWishes).
// `loadWishes(code)` charge les souhaits et sert à valider le code.
// `onLogout` permet au parent de nettoyer son état transitoire (modales…).
export function useAuth({ setPin, loadWishes, onLogout }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ref vers le loader courant, pour que les écouteurs (abonnés une seule
  // fois) restent à jour sans se réabonner.
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
  // (L'actualisation des souhaits est MANUELLE, via le bouton d'actualisation —
  //  plus de synchro périodique, donc plus de déconnexion auto sur inactivité :
  //  elle ne servait qu'à limiter le spam de l'ancienne synchro.)

  return { authed, loading, error, pushDigit, backspace, tryLogin, logout };
}
