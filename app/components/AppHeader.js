"use client";

import { useState } from "react";
import { avatarColor } from "../lib/format";

// En-tête : profil courant (clic pour en changer) + activation biométrie + accès
// à l'historique.
export default function AppHeader({
  me,
  onChangeProfile,
  onOpenHistory,
  canEnableBiometric,
  biometricEnrolled,
  onEnableBiometric,
}) {
  const [bioBusy, setBioBusy] = useState(false);
  const [bioDone, setBioDone] = useState(false);
  const [bioError, setBioError] = useState("");

  async function enable() {
    if (bioBusy) return;
    setBioBusy(true);
    setBioError("");
    try {
      await onEnableBiometric();
      setBioDone(true);
    } catch (e) {
      setBioError(e?.name === "NotAllowedError" ? "Annulé" : "Échec");
    } finally {
      setBioBusy(false);
    }
  }

  return (
    <header className="app-header">
      <button className="me-chip" onClick={onChangeProfile} title="Changer de profil">
        <span className="me-avatar" style={{ background: avatarColor(me) }}>
          {me[0]}
        </span>
        <span className="me-name">{me}</span>
      </button>
      <div className="app-header-actions">
        {canEnableBiometric && !bioDone && (
          <button
            className="history-btn"
            onClick={enable}
            disabled={bioBusy}
            title="Se connecter avec la biométrie la prochaine fois"
          >
            {bioBusy
              ? "…"
              : bioError ||
                (biometricEnrolled ? "🔒" : "🔒 Activer la biométrie")}
          </button>
        )}
        {bioDone && <span className="bio-done">🔒 Biométrie activée</span>}
        <button className="history-btn" onClick={onOpenHistory}>
          Historique
        </button>
      </div>
    </header>
  );
}
