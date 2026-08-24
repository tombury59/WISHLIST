"use client";

import { avatarColor } from "../lib/format";

// En-tête : profil courant (clic = ouvre « Mon compte ») + accès à l'historique.
export default function AppHeader({ me, onOpenAccount, onOpenHistory }) {
  return (
    <header className="app-header">
      <button className="me-chip" onClick={onOpenAccount} title="Mon compte">
        <span className="me-avatar" style={{ background: avatarColor(me) }}>
          {me[0]}
        </span>
        <span className="me-name">{me}</span>
      </button>
      <button className="history-btn" onClick={onOpenHistory}>
        Historique
      </button>
    </header>
  );
}
