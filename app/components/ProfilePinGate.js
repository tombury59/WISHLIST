"use client";

import { useEffect, useState } from "react";
import { getPinStatus, setUserPin, verifyUserPin } from "../lib/pins-api";
import PinPad from "./PinPad";

const MIN_LEN = 4;

// Écran du code d'un profil. Deux cas :
//  - profil sans code (1re fois)  -> "set" puis "confirm" (double saisie)
//  - profil avec code             -> "verify"
// À la réussite, `onUnlock(member)` ouvre le profil ; `onCancel` revient au
// choix des profils.
export default function ProfilePinGate({ familyPin, member, onUnlock, onCancel }) {
  const [mode, setMode] = useState("loading"); // loading | set | confirm | verify
  const [pin, setPin] = useState("");
  const [firstCode, setFirstCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // À l'ouverture : ce profil a-t-il déjà un code ?
  useEffect(() => {
    let alive = true;
    getPinStatus(familyPin)
      .then((data) => {
        if (alive) setMode(data.set?.[member] ? "verify" : "set");
      })
      .catch(() => {
        // En cas d'échec, on tente "set" ; si un code existe déjà, l'API
        // renverra 409 et on basculera en "verify".
        if (alive) setMode("set");
      });
    return () => {
      alive = false;
    };
  }, [familyPin, member]);

  function pushDigit(d) {
    setError("");
    setPin((p) => (p.length < 12 ? p + d : p));
  }
  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  async function submit() {
    if (busy || pin.length < MIN_LEN) return;

    // 1re saisie d'un nouveau code -> on demande la confirmation.
    if (mode === "set") {
      setFirstCode(pin);
      setPin("");
      setError("");
      setMode("confirm");
      return;
    }

    // Confirmation du nouveau code.
    if (mode === "confirm") {
      if (pin !== firstCode) {
        setError("Les codes ne correspondent pas");
        setPin("");
        setFirstCode("");
        setMode("set");
        return;
      }
      setBusy(true);
      try {
        await setUserPin(familyPin, { member, code: pin });
        onUnlock(member);
      } catch (e) {
        if (e?.status === 409) {
          // Un autre appareil vient de définir le code : on demande à le saisir.
          setError("Ce profil a déjà un code. Entre-le.");
          setPin("");
          setFirstCode("");
          setMode("verify");
        } else {
          setError("Impossible d'enregistrer. Réessaie.");
          setPin("");
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    // Vérification d'un code existant.
    setBusy(true);
    try {
      const { ok } = await verifyUserPin(familyPin, { member, code: pin });
      if (ok) {
        onUnlock(member);
      } else {
        setError("Code incorrect");
        setPin("");
      }
    } catch {
      setError("Erreur, réessaie");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "loading") {
    return (
      <main className="gate">
        <div className="gate-card">
          <p className="gate-sub">Chargement…</p>
        </div>
      </main>
    );
  }

  const subtitle =
    mode === "set"
      ? "Nouveau profil — choisis ton code"
      : mode === "confirm"
      ? "Confirme ton code"
      : "Entre ton code";

  return (
    <PinPad
      title={member}
      subtitle={subtitle}
      pin={pin}
      error={error}
      loading={busy}
      canSubmit={!busy && pin.length >= MIN_LEN}
      onDigit={pushDigit}
      onBackspace={backspace}
      onSubmit={submit}
      footer={
        <button type="button" className="gate-back" onClick={onCancel}>
          ‹ Changer de profil
        </button>
      }
    />
  );
}
