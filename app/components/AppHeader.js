import { avatarColor } from "../lib/format";

// En-tête : profil courant (clic pour en changer) + accès à l'historique.
export default function AppHeader({ me, onChangeProfile, onOpenHistory }) {
  return (
    <header className="app-header">
      <button className="me-chip" onClick={onChangeProfile} title="Changer de profil">
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
