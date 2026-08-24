"use client";

import { useState } from "react";
import { MEMBERS } from "../lib/members";
import { avatarColor } from "../lib/format";

// « Qui es-tu ? » — choix du profil, à la Netflix.
// La biométrie (si disponible sur l'appareil) est proposée EN PRIORITÉ ; la
// grille des profils sert de repli (« autre méthode »).
export default function ProfilePicker({ onChoose, biometricAvailable, onBiometric }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onBiometric();
    } catch (e) {
      if (e?.name === "NotAllowedError") {
        setError("Déverrouillage annulé.");
      } else if (e?.name === "NoLocalCredential") {
        // Hors ligne mais l'id de clé n'est pas mémorisé (biométrie activée
        // avant cette mise à jour) : il faut la réactiver une fois en ligne.
        setError("Réactive la biométrie une fois en ligne, puis réessaie.");
      } else {
        setError("Biométrie indisponible. Choisis ton profil.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate">
      <div className="profiles">
        <h1 className="profiles-title">Qui es-tu ?</h1>

        {biometricAvailable && (
          <>
            <button
              type="button"
              className="btn-primary bio-unlock"
              onClick={unlock}
              disabled={busy}
            >
              <span className="bio-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M12 11v3" />
                  <path d="M8.5 4.5a8 8 0 0 1 7 0" />
                  <path d="M5 7a11 11 0 0 1 14 0" />
                  <path d="M7.5 10a6.5 6.5 0 0 1 9 0" />
                  <path d="M9 16.5c.4 1 .5 2 .5 3" />
                  <path d="M15 15.5c.3 1.5.3 3 0 4.5" />
                  <path d="M12 15v.01" />
                </svg>
              </span>
              {busy ? "Déverrouillage…" : "Déverrouiller avec la biométrie"}
            </button>
            {error && <p className="error bio-error">{error}</p>}
            <p className="bio-sep">ou choisis ton profil</p>
          </>
        )}

        <div className="profile-grid">
          {MEMBERS.map((m) => (
            <button
              key={m}
              type="button"
              className="profile-tile"
              onClick={() => onChoose(m)}
            >
              <span className="profile-avatar" style={{ background: avatarColor(m) }}>
                {m[0]}
              </span>
              <span className="profile-name">{m}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
