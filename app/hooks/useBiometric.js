import { useEffect, useState } from "react";
import { STORAGE } from "../lib/constants";
import {
  isBiometricAvailable,
  registerBiometric,
  loginBiometric,
  loginBiometricLocal,
} from "../lib/webauthn-api";

// Clés enrôlées LOCALEMENT sur cet appareil : [{ member, id }]. On mémorise
// l'id de la clé pour pouvoir déverrouiller HORS LIGNE (sans serveur).
// Tolère l'ancien format (tableau de noms) : ces entrées n'ont pas d'id et ne
// serviront qu'en ligne tant qu'on n'a pas ré-activé la biométrie.
function readCreds() {
  try {
    const a = JSON.parse(localStorage.getItem(STORAGE.biometric) || "[]");
    if (!Array.isArray(a)) return [];
    return a.map((e) => (typeof e === "string" ? { member: e, id: null } : e));
  } catch {
    return [];
  }
}

function writeCreds(creds) {
  localStorage.setItem(STORAGE.biometric, JSON.stringify(creds));
}

export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [creds, setCreds] = useState([]);

  useEffect(() => {
    let alive = true;
    isBiometricAvailable().then((a) => {
      if (alive) setAvailable(a);
    });
    setCreds(readCreds());
    return () => {
      alive = false;
    };
  }, []);

  async function enroll(pin, member) {
    const id = await registerBiometric(pin, member);
    const next = [...readCreds().filter((c) => c.member !== member), { member, id }];
    writeCreds(next);
    setCreds(next);
  }

  // Déverrouille le profil `member`. En ligne : vérifié par le serveur. Hors
  // ligne : prompt biométrique local puis confiance locale (le PIN famille
  // reste la barrière serveur).
  function unlock(pin, member) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return loginBiometricLocal(readCreds(), member);
    }
    return loginBiometric(pin, member);
  }

  return { available, enrolled: creds.map((c) => c.member), enroll, unlock };
}
