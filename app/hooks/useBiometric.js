import { useEffect, useState } from "react";
import { STORAGE } from "../lib/constants";
import {
  isBiometricAvailable,
  registerBiometric,
  loginBiometric,
} from "../lib/webauthn-api";

// Suivi LOCAL (par appareil) des profils qui ont activé la biométrie ici.
function readEnrolled() {
  try {
    const a = JSON.parse(localStorage.getItem(STORAGE.biometric) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

// Déverrouillage biométrique : disponibilité de l'appareil, profils enrôlés
// ici, et les deux actions (enrôler / déverrouiller). Le `pin` famille est
// passé au moment de l'appel (il autorise la requête côté serveur).
export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [enrolled, setEnrolled] = useState([]);

  useEffect(() => {
    let alive = true;
    isBiometricAvailable().then((a) => {
      if (alive) setAvailable(a);
    });
    setEnrolled(readEnrolled());
    return () => {
      alive = false;
    };
  }, []);

  async function enroll(pin, member) {
    await registerBiometric(pin, member);
    const next = Array.from(new Set([...readEnrolled(), member]));
    localStorage.setItem(STORAGE.biometric, JSON.stringify(next));
    setEnrolled(next);
  }

  // Renvoie le membre reconnu (lève si annulé / aucune clé).
  function unlock(pin) {
    return loginBiometric(pin);
  }

  return { available, enrolled, enroll, unlock };
}
